"use server";
import { query, queryOne } from "@/lib/db-helpers";
import { RowDataPacket } from "mysql2";
import { getCurrentUser } from "@/app/actions/auth";

// Types
export interface QuotaRow {
  id: number;
  salesman_id: string;
  salesman_name?: string;
  salesman_email?: string;
  month: number;
  year: number;
  month_name?: string;
  target_amount: number | null;
  target_units: number | null;
  target_orders: number | null;
  achieved_amount: number;
  achieved_units: number;
  achieved_orders: number;
  amount_percentage: number | null;
  units_percentage: number | null;
  orders_percentage: number | null;
  status: "pending" | "ongoing" | "completed";
  created_at: string;
  updated_at: string | null;
}

interface QuotaRowDB extends RowDataPacket {
  id: number;
  salesman_id: string;
  salesman_name: string;
  salesman_email: string;
  month: number;
  year: number;
  month_name: string;
  target_amount: string | null;
  target_units: number | null;
  target_orders: number | null;
  achieved_amount: string;
  achieved_units: number;
  achieved_orders: number;
  amount_percentage: string | null;
  units_percentage: string | null;
  orders_percentage: string | null;
  status: "pending" | "ongoing" | "completed";
  created_at: string;
  updated_at: string | null;
}

// Get all quotas with optional filtering
export async function getQuotas(filters?: {
  year?: number;
  month?: number;
  salesman_id?: string;
}): Promise<QuotaRow[]> {
  try {
    let sql = `
      SELECT * FROM quota_report_view
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.year) {
      sql += " AND year = ?";
      params.push(filters.year);
    }

    if (filters?.month) {
      sql += " AND month = ?";
      params.push(filters.month);
    }

    if (filters?.salesman_id) {
      sql += " AND salesman_id = ?";
      params.push(filters.salesman_id);
    }

    sql += " ORDER BY year DESC, month DESC, salesman_name";

    const quotas = await query<QuotaRowDB>(sql, params);

    return quotas.map(q => ({
      ...q,
      target_amount: q.target_amount ? parseFloat(q.target_amount) : null,
      achieved_amount: parseFloat(q.achieved_amount),
      amount_percentage: q.amount_percentage ? parseFloat(q.amount_percentage) : null,
      units_percentage: q.units_percentage ? parseFloat(q.units_percentage) : null,
      orders_percentage: q.orders_percentage ? parseFloat(q.orders_percentage) : null,
    }));
  } catch (error) {
    console.error("Error fetching quotas:", error);
    return [];
  }
}

// Create new quota
export async function createQuota(formData: FormData) {
  const session = await getCurrentUser();
  if (!session) return { error: "Unauthorized" };

  const salesman_id = formData.get("salesman_id") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const target_amount = formData.get("target_amount") as string;
  const target_units = formData.get("target_units") as string;
  const target_orders = formData.get("target_orders") as string;

  if (!salesman_id || !month || !year) {
    return { error: "Salesman, month, and year are required." };
  }

  try {
    await query(`
      INSERT INTO salesman_quotas 
      (salesman_id, month, year, target_amount, target_units, target_orders, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [
      salesman_id,
      month,
      year,
      target_amount ? parseFloat(target_amount) : null,
      target_units ? parseInt(target_units) : null,
      target_orders ? parseInt(target_orders) : null,
    ]);

    return { success: true };
  } catch (error: any) {
    console.error("Error creating quota:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return { error: "Quota already exists for this salesman in this month/year." };
    }
    return { error: "Failed to create quota." };
  }
}

// Update quota
export async function updateQuota(id: number, formData: FormData) {
  const session = await getCurrentUser();
  if (!session) return { error: "Unauthorized" };

  const target_amount = formData.get("target_amount") as string;
  const target_units = formData.get("target_units") as string;
  const target_orders = formData.get("target_orders") as string;
  const achieved_amount = formData.get("achieved_amount") as string;
  const achieved_units = formData.get("achieved_units") as string;
  const achieved_orders = formData.get("achieved_orders") as string;
  const status = formData.get("status") as string;

  try {
    await query(`
      UPDATE salesman_quotas 
      SET target_amount = ?, target_units = ?, target_orders = ?,
          achieved_amount = ?, achieved_units = ?, achieved_orders = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      target_amount ? parseFloat(target_amount) : null,
      target_units ? parseInt(target_units) : null,
      target_orders ? parseInt(target_orders) : null,
      achieved_amount ? parseFloat(achieved_amount) : 0,
      achieved_units ? parseInt(achieved_units) : 0,
      achieved_orders ? parseInt(achieved_orders) : 0,
      status || 'pending',
      id
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error updating quota:", error);
    return { error: "Failed to update quota." };
  }
}

// Get quota summary for current month
export async function getCurrentMonthQuotaSummary(): Promise<{
  total_quotas: number;
  completed_quotas: number;
  total_target: number;
  total_achieved: number;
  completion_rate: number;
}> {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const summary = await queryOne<any>(`
      SELECT 
        COUNT(*) as total_quotas,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_quotas,
        COALESCE(SUM(target_amount), 0) as total_target,
        COALESCE(SUM(achieved_amount), 0) as total_achieved
      FROM salesman_quotas 
      WHERE month = ? AND year = ?
    `, [currentMonth, currentYear]);

    const completion_rate = summary?.total_quotas > 0 
      ? (summary.completed_quotas / summary.total_quotas) * 100 
      : 0;

    return {
      total_quotas: summary?.total_quotas || 0,
      completed_quotas: summary?.completed_quotas || 0,
      total_target: parseFloat(summary?.total_target || "0"),
      total_achieved: parseFloat(summary?.total_achieved || "0"),
      completion_rate: Math.round(completion_rate)
    };
  } catch (error) {
    console.error("Error fetching quota summary:", error);
    return {
      total_quotas: 0,
      completed_quotas: 0,
      total_target: 0,
      total_achieved: 0,
      completion_rate: 0
    };
  }
}

// Get salesmen for quota assignment
export async function getSalesmenForQuota(): Promise<{ id: string; name: string; email: string }[]> {
  try {
    const salesmen = await query<any>(`
      SELECT u.id, u.full_name as name, u.email 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('salesman', 'sales') 
      AND u.is_active = 1 
      ORDER BY u.full_name
    `);

    return salesmen;
  } catch (error) {
    console.error("Error fetching salesmen:", error);
    return [];
  }
}