"use server";
import supabase from "@/lib/db";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface SupervisorKPIs {
  activeSalesmen: number;
  visitsToday: number;
  submittedCallsheets: number;
  pendingCallsheetReviews: number;

  pendingBookings: number;
  monthlySalesTotal: number;
  lowStockItems: number;
}

export interface TeamSalesman {
  id: string;
  full_name: string;
  email: string;
  status: string;
  visitsToday: number;
  totalCallsheets: number;
  confirmedBookings: number;
  monthlySales: number;
}

// ══════════════════════════════════════════════════════════════
// SUPERVISOR DASHBOARD
// ══════════════════════════════════════════════════════════════

export async function getSupervisorKPIs(): Promise<SupervisorKPIs> {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  try {
    const [
      activeSalesmen,
      visitsToday,
      submittedCallsheets,
      pendingBookings,
      salesData,
      lowStockItems,
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role_id", 3).eq("is_active", true),
      supabase.from("store_visits").select("*", { count: "exact", head: true }).gte("visit_date", today),
      supabase.from("callsheets").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("sales_transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("sales_transactions").select("total_amount").gte("created_at", monthStart),
      supabase.from("inventory_ledger").select("*", { count: "exact", head: true }).lt("balance", 10),
    ]);

    const monthlySalesTotal = (salesData.data || []).reduce(
      (sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0
    );

    return {
      activeSalesmen: activeSalesmen.count ?? 0,
      visitsToday: visitsToday.count ?? 0,
      submittedCallsheets: submittedCallsheets.count ?? 0,
      pendingCallsheetReviews: submittedCallsheets.count ?? 0,
      pendingBookings: pendingBookings.count ?? 0,
      monthlySalesTotal,
      lowStockItems: lowStockItems.count ?? 0,
    };
  } catch (error) {
    console.error("Error fetching supervisor KPIs:", error);
    return { activeSalesmen: 0, visitsToday: 0, submittedCallsheets: 0, pendingCallsheetReviews: 0, pendingBookings: 0, monthlySalesTotal: 0, lowStockItems: 0 };
  }
}

// ══════════════════════════════════════════════════════════════
// TEAM MONITORING
// ══════════════════════════════════════════════════════════════

export async function getTeamSalesmen(): Promise<TeamSalesman[]> {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  try {
    const { data: salesmen } = await supabase
      .from("users")
      .select("id, full_name, email, status, is_active")
      .eq("role_id", 3)
      .order("full_name");

    const results: TeamSalesman[] = await Promise.all(
      (salesmen || []).map(async (s: any) => {
        const [visitsToday, totalCallsheets, confirmedBookings, salesData] = await Promise.all([
          supabase.from("store_visits").select("*", { count: "exact", head: true }).eq("salesman_id", s.id).gte("visit_date", today),
          supabase.from("callsheets").select("*", { count: "exact", head: true }).eq("salesman_id", s.id),
          supabase.from("sales_transactions").select("*", { count: "exact", head: true }).eq("salesman_id", s.id).neq("status", "cancelled"),
          supabase.from("sales_transactions").select("total_amount").eq("salesman_id", s.id).gte("created_at", monthStart),
        ]);

        return {
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          status: s.is_active ? "active" : "inactive",
          visitsToday: visitsToday.count ?? 0,
          totalCallsheets: totalCallsheets.count ?? 0,
          confirmedBookings: confirmedBookings.count ?? 0,
          monthlySales: (salesData.data || []).reduce((sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0),
        };
      })
    );

    return results;
  } catch (error) {
    console.error("Error fetching team salesmen:", error);
    return [];
  }
}

export async function getSalesmanDetail(salesmanId: string) {
  try {
    const [profileRes, visitsRes, callsheetsRes, bookingsRes] = await Promise.all([
      supabase.from("users").select("id, full_name, email, phone_number, status, created_at").eq("id", salesmanId).maybeSingle(),
      supabase.from("store_visits").select("*, customers(store_name)").eq("salesman_id", salesmanId).order("visit_date", { ascending: false }).limit(20),
      supabase.from("callsheets").select("*, customers(store_name)").eq("salesman_id", salesmanId).order("created_at", { ascending: false }).limit(20),
      supabase.from("sales_transactions").select("*, customers(store_name)").eq("salesman_id", salesmanId).order("created_at", { ascending: false }).limit(20),
    ]);

    return {
      profile: profileRes.data || null,
      visits: visitsRes.data || [],
      callsheets: callsheetsRes.data || [],
      bookings: bookingsRes.data || [],
    };
  } catch (error) {
    console.error("Error fetching salesman detail:", error);
    return { profile: null, visits: [], callsheets: [], bookings: [] };
  }
}

// ══════════════════════════════════════════════════════════════
// CUSTOMERS MONITORING
// ══════════════════════════════════════════════════════════════

export async function getTeamCustomers() {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*, users:assigned_salesman_id(full_name)")
      .eq("is_active", true)
      .order("store_name");
    if (error) throw error;
    return (data || []).map((c: any) => ({
      ...c,
      salesman_name: c.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching team customers:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// VISITS MONITORING
// ══════════════════════════════════════════════════════════════

export async function getTeamVisits() {
  try {
    const { data, error } = await supabase
      .from("store_visits")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .order("visit_date", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map((v: any) => ({
      ...v,
      store_name: v.customers?.store_name || null,
      salesman_name: v.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching team visits:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// CALLSHEETS
// ══════════════════════════════════════════════════════════════

export async function getCallsheetDetail(callsheetId: string) {
  try {
    const { data: callsheet } = await supabase
      .from("callsheets")
      .select("*, customers(store_name, address), users:salesman_id(full_name, email)")
      .eq("id", callsheetId)
      .maybeSingle();

    if (!callsheet) return null;

    const { data: items } = await supabase
      .from("callsheet_items")
      .select("*, products(name, total_packaging, net_weight)")
      .eq("callsheet_id", callsheetId);

    return {
      ...callsheet,
      store_name: callsheet.customers?.store_name || null,
      address: callsheet.customers?.address || null,
      salesman_name: callsheet.users?.full_name || null,
      salesman_email: callsheet.users?.email || null,
      callsheet_items: items || [],
    };
  } catch (error) {
    console.error("Error fetching callsheet detail:", error);
    return null;
  }
}

export async function reviewCallsheet(callsheetId: string, status: "approved" | "rejected", supervisorNote?: string) {
  try {
    const { error } = await supabase
      .from("callsheets")
      .update({ status, remarks: supervisorNote || null })
      .eq("id", callsheetId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error reviewing callsheet:", error);
    return { error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER REQUESTS MONITORING
// ══════════════════════════════════════════════════════════════

export async function getTeamBuyerRequests() {
  try {
    const { data: requests } = await supabase
      .from("buyer_requests")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    const requestIds = (requests || []).map((r: any) => r.id);
    let itemsMap = new Map<string, any[]>();

    if (requestIds.length > 0) {
      const { data: items } = await supabase
        .from("buyer_request_items")
        .select("*, products(name)")
        .in("request_id", requestIds);

      for (const item of (items || [])) {
        if (!itemsMap.has(item.request_id)) itemsMap.set(item.request_id, []);
        itemsMap.get(item.request_id)!.push(item);
      }
    }

    return (requests || []).map((r: any) => ({
      ...r,
      store_name: r.customers?.store_name || null,
      salesman_name: r.users?.full_name || null,
      buyer_request_items: itemsMap.get(r.id) || [],
    }));
  } catch (error) {
    console.error("Error fetching team buyer requests:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// BOOKINGS / ORDERS MONITORING
// ══════════════════════════════════════════════════════════════

export async function getTeamBookings() {
  try {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      store_name: t.customers?.store_name || null,
      salesman_name: t.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching team bookings:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// INVENTORY IMPACT VIEW
// ══════════════════════════════════════════════════════════════

export async function getInventoryImpact() {
  try {
    const { data: lowStock } = await supabase
      .from("inventory_ledger")
      .select("*, product_variants:product_variant_id(name, sku, products:product_id(name))")
      .lt("balance", 10)
      .order("balance", { ascending: true })
      .limit(20);

    const { data: recentMovements } = await supabase
      .from("inventory_ledger")
      .select("*, product_variants:product_variant_id(name, sku, products:product_id(name))")
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      lowStock: (lowStock || []).map((item: any) => ({
        ...item,
        variant_name: item.product_variants?.name || null,
        sku: item.product_variants?.sku || null,
        product_name: item.product_variants?.products?.name || null,
      })),
      recentMovements: (recentMovements || []).map((item: any) => ({
        ...item,
        variant_name: item.product_variants?.name || null,
        sku: item.product_variants?.sku || null,
        product_name: item.product_variants?.products?.name || null,
      })),
    };
  } catch (error) {
    console.error("Error fetching inventory impact:", error);
    return { lowStock: [], recentMovements: [] };
  }
}

// ══════════════════════════════════════════════════════════════
// RECENT ACTIVITY (for dashboard feed)
// ══════════════════════════════════════════════════════════════

export async function getRecentTeamActivity() {
  try {
    const [visitsRes, callsheetsRes, requestsRes] = await Promise.all([
      supabase.from("store_visits")
        .select("id, visit_date, created_at, customers(store_name), users:salesman_id(full_name)")
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("callsheets")
        .select("id, status, created_at, customers(store_name), users:salesman_id(full_name)")
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("buyer_requests")
        .select("id, status, created_at, customers(store_name), users:salesman_id(full_name)")
        .order("created_at", { ascending: false }).limit(5),
    ]);

    return {
      visits: (visitsRes.data || []).map((v: any) => ({
        ...v,
        store_name: v.customers?.store_name || null,
        salesman_name: v.users?.full_name || null,
      })),
      callsheets: (callsheetsRes.data || []).map((cs: any) => ({
        ...cs,
        store_name: cs.customers?.store_name || null,
        salesman_name: cs.users?.full_name || null,
      })),
      requests: (requestsRes.data || []).map((br: any) => ({
        ...br,
        store_name: br.customers?.store_name || null,
        salesman_name: br.users?.full_name || null,
      })),
    };
  } catch (error) {
    console.error("Error fetching recent team activity:", error);
    return { visits: [], callsheets: [], requests: [] };
  }
}
