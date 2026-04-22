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
    orderTarget: number;
    orderAchieved: number;
    orderPercentage: number;
    month: number;
    year: number;
    status: "Achieved" | "On Track" | "Below Target" | "No Target";
  } | null;
}

export async function getSalesmanKPIs(userId: string): Promise<SalesmanKPIs> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();

    const [visits, pendingCS, submittedCS, buyerReqs, myMonthlyBookings, quotaRes, myMonthlySales, companyMonthlySales] = await Promise.all([
      supabase.from("store_visits").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).gte("visit_date", `${today}T00:00:00`),
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "draft"),
      supabase.from("callsheets").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "submitted"),
      supabase.from("buyer_requests").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).eq("status", "pending"),
      // My successful bookings this month (including in-progress ones)
      supabase.from("sales_transactions").select("*", { count: "exact", head: true })
        .eq("salesman_id", userId).in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
      // My quota settings
      supabase.from("quota_report_view").select("target_amount, achieved_amount, target_orders, achieved_orders, month, year")
        .eq("salesman_id", userId).eq("month", currentMonth).eq("year", currentYear).maybeSingle(),
      // My sales values this month
      supabase.from("sales_transactions").select("total_amount")
        .eq("salesman_id", userId).in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
      // Company-wide sales this month for dynamic comparison
      supabase.from("sales_transactions").select("total_amount")
        .in("status", ["pending", "approved", "completed"])
        .gte("created_at", startDate).lt("created_at", endDate),
    ]);

    // Financial Achievements
    const myTotalAmount = (myMonthlySales.data || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);
    const companyTotalAmount = (companyMonthlySales.data || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);

    // Target Logic: Search for the most relevant quota
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
      
      quotaDataRes = latestQuota;
    }

    const hasAssignedQuota = quotaDataRes && Number(quotaDataRes.target_amount) > 0;
    const targetAmount = hasAssignedQuota ? Number(quotaDataRes.target_amount) : companyTotalAmount;
    
    // Percentage Logic
    const calculatedPercentage = targetAmount > 0 
      ? Math.min(100, Math.round((myTotalAmount / targetAmount) * 100)) 
      : (myTotalAmount > 0 ? 100 : 0);

    // Dynamic Status Logic
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
      orderTarget: Number(quotaDataRes?.target_orders || 0),
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
