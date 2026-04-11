"use server";
import supabase from "@/lib/db";

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
    month: number;
    year: number;
  } | null;
}

export async function getSalesmanKPIs(userId: string): Promise<SalesmanKPIs> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();

    const [visits, pendingCS, submittedCS, buyerReqs, bookings, quotaRes, achievedRes] = await Promise.all([
      supabase.from("store_visits").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).gte("visit_date", `${today}T00:00:00`),
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "draft"),
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "submitted"),
      supabase.from("buyer_requests").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "pending"),
      supabase.from("sales_transactions").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "completed"),
      supabase.from("quota_report_view").select("target_amount, achieved_amount")
        .eq("salesman_id", userId).eq("month", currentMonth).eq("year", currentYear).maybeSingle(),
      supabase.from("sales_transactions").select("total_amount")
        .eq("salesman_id", userId).eq("status", "completed")
        .gte("created_at", startDate).lt("created_at", endDate),
    ]);

    let quotaData = null;
    
    // If quotaRes has data, use its target
    const targetAmount = quotaRes.data ? Number(quotaRes.data.target_amount) : 0;
    
    // Calculate achieved from realtime sales as requested: "revenue of your completed visit sell"
    const calculatedAchieved = (achievedRes.data || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);
    
    // Check if view has achieved amount already
    const viewAchieved = quotaRes.data ? Number(quotaRes.data.achieved_amount) : 0;
    
    // Determine the achieved amount by taking whichever is higher or relying on calculated
    const finalAchieved = calculatedAchieved > 0 ? calculatedAchieved : viewAchieved;

    // We always supply quotaData to the UI so it doesn't break if target is 0
    quotaData = {
      target: targetAmount,
      achieved: finalAchieved,
      percentage: targetAmount > 0 ? Math.min(100, Math.round((finalAchieved / targetAmount) * 100)) : 0,
      month: currentMonth,
      year: currentYear,
    };

    return {
      todayVisits: visits.count ?? 0,
      pendingCallsheets: pendingCS.count ?? 0,
      submittedCallsheets: submittedCS.count ?? 0,
      pendingBuyerRequests: buyerReqs.count ?? 0,
      confirmedBookings: bookings.count ?? 0,
      quota: quotaData,
    };
  } catch (err) {
    console.error("Salesman KPI error:", err);
    return { todayVisits: 0, pendingCallsheets: 0, submittedCallsheets: 0, pendingBuyerRequests: 0, confirmedBookings: 0, quota: null };
  }
}

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
