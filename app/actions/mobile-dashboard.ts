"use server";
import supabase from "@/lib/db";
import { getCurrentUser } from "@/app/actions/auth";

/**
 * Interface representing the summary data for the Salesman's mobile dashboard.
 */
export interface MobileDashboardData {
  user: { full_name: string; avatar_url?: string };
  targets: { daily_sales_percentage: number };
  stats: { 
    todays_visits: number; 
    draft_callsheets: number; 
    bookings: number; 
    total_buyers: number 
  };
  recent_activity: any[];
}

/**
 * Aggregates all necessary data for the mobile landing page in a single call.
 * 1. Authenticates current salesman.
 * 2. Fetches sales performance quota (Month-to-Date).
 * 3. Counts today's field visits.
 * 4. Counts active draft callsheets and pending bookings.
 * 5. Returns buyer count assigned to this salesman.
 */
export async function getSalesmanMobileData(): Promise<MobileDashboardData> {
  const session = await getCurrentUser();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  // Parallel execute all counts and lookups for fast mobile loading
  const [quotaRes, visitsRes, callsheetsRes, bookingsRes, buyersRes] = await Promise.all([
    // Get sales target performance from the report view
    supabase.from("quota_report_view")
      .select("amount_percentage")
      .eq("salesman_id", userId).eq("month", currentMonth).eq("year", currentYear)
      .maybeSingle(),
    // Count visits logged today
    supabase.from("store_visits")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).eq("visit_date", today),
    // Count unfinished work (draft callsheets)
    supabase.from("callsheets")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).eq("status", "draft"),
    // Count active transactions
    supabase.from("sales_transactions")
      .select("*", { count: "exact", head: true })
      .eq("salesman_id", userId).in("status", ["pending", "approved"]),
    // Count the salesman's client directory size
    supabase.from("customers")
      .select("*", { count: "exact", head: true })
      .eq("assigned_salesman_id", userId).eq("is_active", true),
  ]);

  return {
    user: {
      full_name: session.user.full_name,
      // Dynamic avatar generation using a third-party service
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
    recent_activity: [], // Reserved for future feed implementation
  };
}
