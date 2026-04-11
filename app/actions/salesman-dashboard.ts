"use server";
import supabase from "@/lib/db";

export interface SalesmanKPIs {
  todayVisits: number;
  pendingCallsheets: number;
  submittedCallsheets: number;
  pendingBuyerRequests: number;
  confirmedBookings: number;
}

export async function getSalesmanKPIs(userId: string): Promise<SalesmanKPIs> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [visits, pendingCS, submittedCS, buyerReqs, bookings] = await Promise.all([
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
    ]);

    return {
      todayVisits: visits.count ?? 0,
      pendingCallsheets: pendingCS.count ?? 0,
      submittedCallsheets: submittedCS.count ?? 0,
      pendingBuyerRequests: buyerReqs.count ?? 0,
      confirmedBookings: bookings.count ?? 0,
    };
  } catch (err) {
    console.error("Salesman KPI error:", err);
    return { todayVisits: 0, pendingCallsheets: 0, submittedCallsheets: 0, pendingBuyerRequests: 0, confirmedBookings: 0 };
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
