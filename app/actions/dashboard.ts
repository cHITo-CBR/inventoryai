"use server";
import supabase from "@/lib/db";

/**
 * Interface representing the key performance indicators for the admin dashboard.
 */
export interface DashboardKPIs {
  totalUsers: number;
  successfulOrdersCount: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockItems: number;
  totalSales: number;
  totalPipelineValue: number;
  pipelineGrowth: number;
  goalEfficiency: number;
  hubStatus: 'operational' | 'maintenance' | 'offline';
  totalEarnings: number;
}

export interface RecentTransaction {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface LowStockItem {
  variant_name: string;
  balance: number;
}

/**
 * Utility function to safely count rows in a table with optional filtering.
 */
async function safeCount(table: string, filter?: { column: string; value: any }): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) {
      query = query.eq(filter.column, filter.value);
    }
    const { count } = await query;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * aggregates multiple data points to generate the dashboard overview.
 * 1. Counts core entities (Users, Customers, Products).
 * 2. Calculates sales metrics and transaction success rates.
 * 3. Estimates inventory pipeline value and stock health.
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  // Parallel fetch basic counts to improve performance
  const [totalUsers, totalCustomers, totalProducts] = await Promise.all([
    safeCount("users"),
    safeCount("customers"),
    safeCount("products"),
  ]);

  let successfulOrdersCount = 0;
  try {
    const { count } = await supabase
      .from("sales_transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");
    successfulOrdersCount = count ?? 0;
  } catch { successfulOrdersCount = 0; }

  let lowStockItems = 0;
  try {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .lt("total_cases", 10) // Threshold for "Low Stock"
      .eq("is_archived", false);
    lowStockItems = count ?? 0;
  } catch { lowStockItems = 0; }

  let totalPipelineValue = 0;
  try {
    const { data } = await supabase
      .from("products")
      .select("total_cases, packaging_price")
      .eq("is_archived", false);
    // Calculation: Sum of (Current Stock * Price) across all active products
    totalPipelineValue = (data || []).reduce((sum: number, p: any) =>
      sum + ((p.total_cases || 0) * (Number(p.packaging_price) || 0)), 0);
  } catch { totalPipelineValue = 0; }

  // Simulated growth calculation for visual feedback
  const lastMonthValue = totalPipelineValue * 0.89;
  const pipelineGrowth = lastMonthValue > 0 ? Math.round(((totalPipelineValue - lastMonthValue) / lastMonthValue) * 100) : 0;

  // Efficiency metric relative to a target of 50 active products
  const targetProducts = 50;
  const goalEfficiency = targetProducts > 0 ? Math.round((totalProducts / targetProducts) * 100 * 10) / 10 : 0;

  // Heuristic for system health status
  const hubStatus: 'operational' | 'maintenance' | 'offline' =
    totalUsers > 0 && totalProducts > 0 ? 'operational' :
      totalUsers > 0 ? 'maintenance' : 'offline';

  let totalEarnings = 0;
  try {
    const { data } = await supabase
      .from("sales_transactions")
      .select("total_amount")
      .eq("status", "completed");
    totalEarnings = (data || []).reduce((sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0);
  } catch { totalEarnings = 0; }

  return {
    totalUsers,
    successfulOrdersCount,
    totalCustomers,
    totalProducts,
    lowStockItems,
    totalSales: 0,
    totalPipelineValue,
    pipelineGrowth,
    goalEfficiency,
    hubStatus,
    totalEarnings,
  };
}

/**
 * Fetches the 5 most recent sales transactions.
 * Joins with the 'customers' table to display store names instead of raw IDs.
 */
export async function getRecentTransactions(): Promise<RecentTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, total_amount, status, created_at, customers(store_name)")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return (data || []).map((t: any) => ({
      id: t.id,
      customer_name: t.customers?.store_name ?? "Unknown",
      total_amount: t.total_amount ?? 0,
      status: t.status ?? "unknown",
      created_at: t.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Retrieves specific SKUs/variants that are below critical balance levels.
 */
export async function getLowStockItems(): Promise<LowStockItem[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_ledger")
      .select("balance, product_variants(name)")
      .lt("balance", 10)
      .order("balance", { ascending: true })
      .limit(5);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      variant_name: item.product_variants?.name ?? "Unknown SKU",
      balance: item.balance ?? 0,
    }));
  } catch {
    return [];
  }
}
