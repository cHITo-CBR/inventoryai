"use server";
import supabase from "@/lib/db";

/**
 * Interface representing Key Performance Indicators (KPIs) for a specific Salesman.
 */
export interface SalesmanKPIs {
  todayVisits: number;
  pendingCallsheets: number;
  submittedCallsheets: number;
  pendingBuyerRequests: number;
  confirmedBookings: number;
  quota: {
    target: number;
    achieved: number;
    percentage: number;
    orderTarget: number;
    orderAchieved: number;
    orderPercentage: number;
    month: number;
    year: number;
    status: "Achieved" | "On Track" | "Below Target" | "No Target";
  } | null;
}

/**
 * Aggregates all relevant performance data for a salesman's dashboard.
 * 1. Counts daily visits, draft callsheets, and active requests.
 * 2. Fetches monthly sales achievements vs targets.
 * 3. Dynamically calculates progress status (e.g., 'On Track' vs 'Below Target').
 */
export async function getSalesmanKPIs(userId: string): Promise<SalesmanKPIs> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Defined time range for the current calendar month
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();

    // Execute multiple database queries in parallel for maximum speed
    const [visits, pendingCS, submittedCS, buyerReqs, myMonthlyBookings, quotaRes, myMonthlySales, companyMonthlySales] = await Promise.all([
      // Count field visits logged today
      supabase.from("store_visits").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).gte("visit_date", `${today}T00:00:00`),
      // Count draft work (not yet submitted)
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "draft"),
      // Count work finalized and submitted to supervisors
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "submitted"),
      // Count pending new store/buyer requests
      supabase.from("buyer_requests").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "pending"),
      // Count sales transactions finalized this month
      supabase.from("sales_transactions").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
      // Fetch specific performance goals (Quotas)
      supabase.from("quota_report_view").select("target_amount, achieved_amount, target_orders, achieved_orders, month, year")
        .eq("salesman_id", userId).eq("month", currentMonth).eq("year", currentYear).maybeSingle(),
      // Fetch raw transaction data for financial aggregation
      supabase.from("sales_transactions").select("total_amount")
        .eq("salesman_id", userId).in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
      // Company context for dynamic targets if specific quota is missing
      supabase.from("sales_transactions").select("total_amount")
        .in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
    ]);

    // Calculate total financial volume achieved by the salesman
    const myTotalAmount = (myMonthlySales.data || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);
    const companyTotalAmount = (companyMonthlySales.data || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);

    // TARGET LOGIC: Priority 1: User-specific quota; Priority 2: Most recent past quota; Priority 3: Company average
    let quotaDataRes = quotaRes.data;
    if (!quotaDataRes) {
      const { data: latestQuota } = await supabase
        .from("quota_report_view")
        .select("target_amount, achieved_amount, target_orders, achieved_orders, month, year")
        .eq("salesman_id", userId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();
      quotaDataRes = latestQuota as typeof quotaDataRes;
    }

    const quotaTargetAmount = quotaDataRes ? Number(quotaDataRes.target_amount) : 0;
    const targetAmount = quotaTargetAmount > 0 ? quotaTargetAmount : companyTotalAmount;
    
    // Calculate progress percentage
    const calculatedPercentage = targetAmount > 0 
      ? Math.min(100, Math.round((myTotalAmount / targetAmount) * 100)) 
      : (myTotalAmount > 0 ? 100 : 0);

    // DYNAMIC STATUS: Determines if the salesman is meeting expectations based on the day of the month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = new Date().getDate();
    const elapsedPercentage = (currentDay / daysInMonth) * 100;
    
    let status: "Achieved" | "On Track" | "Below Target" | "No Target" = "No Target";
    if (calculatedPercentage >= 100) status = "Achieved";
    else if (targetAmount > 0) {
      status = (calculatedPercentage >= (elapsedPercentage * 0.9)) ? "On Track" : "Below Target";
    }

    const quotaData = {
      target: targetAmount,
      achieved: myTotalAmount,
      percentage: calculatedPercentage,
      orderTarget: Number(quotaDataRes?.target_orders ?? 0),
      orderAchieved: myMonthlyBookings.count ?? 0,
      orderPercentage: quotaDataRes?.target_orders ? Math.min(100, Math.round(((myMonthlyBookings.count ?? 0) / Number(quotaDataRes.target_orders)) * 100)) : 0,
      month: quotaDataRes?.month ?? currentMonth,
      year: quotaDataRes?.year ?? currentYear,
      status: status,
    };

    return {
      todayVisits: visits.count ?? 0,
      pendingCallsheets: pendingCS.count ?? 0,
      submittedCallsheets: submittedCS.count ?? 0,
      pendingBuyerRequests: buyerReqs.count ?? 0,
      confirmedBookings: myMonthlyBookings.count ?? 0,
      quota: quotaData,
    };
  } catch (err) {
    console.error("Salesman KPI error:", err);
    return { todayVisits: 0, pendingCallsheets: 0, submittedCallsheets: 0, pendingBuyerRequests: 0, confirmedBookings: 0, quota: null };
  }
}

/**
 * Retrieves the salesman's most recent physical visits and callsheet updates.
 */
export async function getSalesmanRecentActivity(userId: string) {
  try {
    const [visitsRes, callsheetsRes] = await Promise.all([
      supabase
        .from("store_visits")
        .select("id, visit_date, notes, created_at, customers(store_name)")
        .eq("salesman_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("callsheets")
        .select("id, status, visit_date, updated_at, customers(store_name)")
        .eq("salesman_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3),
    ]);

    return {
      visits: (visitsRes.data || []).map((v: any) => ({
        ...v,
        customers: v.customers || null,
      })),
      callsheets: (callsheetsRes.data || []).map((cs: any) => ({
        ...cs,
        customers: cs.customers || null,
      })),
    };
  } catch {
    return { visits: [], callsheets: [] };
  }
}
