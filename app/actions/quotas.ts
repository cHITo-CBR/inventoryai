"use server";
import supabase from "@/lib/db";
import { getCurrentUser } from "@/app/actions/auth";

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
  dynamicStatus?: "Achieved" | "On Track" | "Below Target" | "Pending";
  created_at: string;
  updated_at: string | null;
}

export async function getQuotas(filters?: {
  year?: number;
  month?: number;
  salesman_id?: string;
}): Promise<QuotaRow[]> {
  try {
    let query = supabase
      .from("quota_report_view")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (filters?.year) query = query.eq("year", filters.year);
    if (filters?.month) query = query.eq("month", filters.month);
    if (filters?.salesman_id) query = query.eq("salesman_id", filters.salesman_id);

    const { data, error } = await query;
    if (error) throw error;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = new Date().getDate();
    const elapsedPercentage = (currentDay / daysInMonth) * 100;

    const quotasWithLiveAchievements = await Promise.all((data || []).map(async (q: any) => {
      // Calculate start and end date for the quota's month
      const startDate = new Date(q.year, q.month - 1, 1).toISOString();
      const endDate = new Date(q.year, q.month, 1).toISOString();

      // Fetch live transactions for this salesman in this specific month
      const { data: txs } = await supabase
        .from("sales_transactions")
        .select("total_amount")
        .eq("salesman_id", q.salesman_id)
        .in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate)
        .lt("created_at", endDate);

      const liveAchievedAmount = (txs || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);
      
      const { count: liveAchievedOrders } = await supabase
        .from("sales_transactions")
        .select("*", { count: "exact", head: true })
        .eq("salesman_id", q.salesman_id)
        .in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate)
        .lt("created_at", endDate);

      const targetAmount = q.target_amount ? Number(q.target_amount) : 0;
      const achievedAmount = liveAchievedAmount > 0 ? liveAchievedAmount : Number(q.achieved_amount);
      const achievedOrders = liveAchievedOrders && liveAchievedOrders > 0 ? liveAchievedOrders : Number(q.achieved_orders);
      
      const percentage = targetAmount > 0 ? (achievedAmount / targetAmount) * 100 : 0;
      
      let dynamicStatus: "Achieved" | "On Track" | "Below Target" | "Pending" = "Pending";
      
      if (percentage >= 100) {
        dynamicStatus = "Achieved";
      } else if (targetAmount > 0 && q.month === currentMonth && q.year === currentYear) {
        dynamicStatus = (percentage >= (elapsedPercentage * 0.9)) ? "On Track" : "Below Target";
      } else if (q.status === "completed") {
        dynamicStatus = "Achieved";
      }

      return {
        ...q,
        target_amount: q.target_amount ? Number(q.target_amount) : null,
        achieved_amount: achievedAmount,
        achieved_orders: achievedOrders,
        amount_percentage: percentage,
        units_percentage: q.target_units ? (achievedOrders / Number(q.target_units)) * 100 : null,
        orders_percentage: q.target_orders ? (achievedOrders / Number(q.target_orders)) * 100 : null,
        dynamicStatus,
      };
    }));

    return quotasWithLiveAchievements;
  } catch (error) {
    console.error("Error fetching quotas:", error);
    return [];
  }
}

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
    const { error } = await supabase.from("salesman_quotas").insert({
      salesman_id,
      month,
      year,
      target_amount: target_amount ? parseFloat(target_amount) : null,
      target_units: target_units ? parseInt(target_units) : null,
      target_orders: target_orders ? parseInt(target_orders) : null,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "Quota already exists for this salesman in this month/year." };
      }
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating quota:", error);
    return { error: "Failed to create quota." };
  }
}

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
    const { error } = await supabase
      .from("salesman_quotas")
      .update({
        target_amount: target_amount ? parseFloat(target_amount) : null,
        target_units: target_units ? parseInt(target_units) : null,
        target_orders: target_orders ? parseInt(target_orders) : null,
        achieved_amount: achieved_amount ? parseFloat(achieved_amount) : 0,
        achieved_units: achieved_units ? parseInt(achieved_units) : 0,
        achieved_orders: achieved_orders ? parseInt(achieved_orders) : 0,
        status: status || "pending",
      })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating quota:", error);
    return { error: "Failed to update quota." };
  }
}

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

    const { data, error } = await supabase
      .from("salesman_quotas")
      .select("salesman_id, target_amount, achieved_amount, status")
      .eq("month", currentMonth)
      .eq("year", currentYear);

    if (error) throw error;

    const records = data || [];
    
    // Also fetch live achieved amounts for the summary to be accurate
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();
    
    let total_achieved = 0;
    let completed_quotas = 0;
    
    for (const r of records) {
      const { data: txs } = await supabase
        .from("sales_transactions")
        .select("total_amount")
        .eq("salesman_id", r.salesman_id)
        .in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate)
        .lt("created_at", endDate);
        
      const liveAchievedAmount = (txs || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);
      const finalAchieved = liveAchievedAmount > 0 ? liveAchievedAmount : (Number(r.achieved_amount) || 0);
      total_achieved += finalAchieved;
      
      const target = Number(r.target_amount) || 0;
      if (target > 0 && finalAchieved >= target) {
        completed_quotas++;
      } else if (r.status === "completed") {
        completed_quotas++;
      }
    }

    const total_quotas = records.length;
    const total_target = records.reduce((sum: number, r: any) => sum + (Number(r.target_amount) || 0), 0);
    const completion_rate = total_quotas > 0 ? Math.round((completed_quotas / total_quotas) * 100) : 0;

    return { total_quotas, completed_quotas, total_target, total_achieved, completion_rate };
  } catch (error) {
    console.error("Error fetching quota summary:", error);
    return { total_quotas: 0, completed_quotas: 0, total_target: 0, total_achieved: 0, completion_rate: 0 };
  }
}

export async function getSalesmenForQuota(): Promise<{ id: string; name: string; email: string }[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, roles!inner(name)")
      .in("roles.name", ["salesman", "sales"])
      .eq("is_active", true)
      .order("full_name");

    if (error) throw error;

    return (data || []).map((u: any) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
    }));
  } catch (error) {
    console.error("Error fetching salesmen:", error);
    // Fallback: query by role_id 3 directly
    try {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role_id", 3)
        .eq("is_active", true)
        .order("full_name");
      return (data || []).map((u: any) => ({ id: u.id, name: u.full_name, email: u.email }));
    } catch {
      return [];
    }
  }
}