"use server";
import supabase from "@/lib/db";
import { getCurrentUser } from "@/app/actions/auth";

export interface MobileDashboardData {
  user: { full_name: string; avatar_url?: string };
  targets: { daily_sales_percentage: number };
  stats: { todays_visits: number; draft_callsheets: number; bookings: number; total_buyers: number };
  recent_activity: any[];
}

export async function getSalesmanMobileData(): Promise<MobileDashboardData> {
  const session = await getCurrentUser();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const [quotaRes, visitsRes, callsheetsRes, bookingsRes, buyersRes] = await Promise.all([
    supabase.from("quota_report_view")
      .select("amount_percentage")
      .eq("salesman_id", userId).eq("month", currentMonth).eq("year", currentYear)
      .maybeSingle(),
    supabase.from("store_visits")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).eq("visit_date", today),
    supabase.from("callsheets")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).eq("status", "draft"),
    supabase.from("sales_transactions")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).in("status", ["pending", "approved"]),
    supabase.from("customers")
      .select("*", { count: "exact", head: true })
      .eq("assigned_salesman_id", userId).eq("is_active", true),
  ]);

  return {
    user: {
      full_name: session.user.full_name,
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + session.user.full_name,
    },
    targets: {
      daily_sales_percentage: quotaRes.data?.amount_percentage ? Number(quotaRes.data.amount_percentage) : 0,
    },
    stats: {
      todays_visits: visitsRes.count || 0,
      draft_callsheets: callsheetsRes.count || 0,
      bookings: bookingsRes.count || 0,
      total_buyers: buyersRes.count || 0,
    },
    recent_activity: [],
  };
}
