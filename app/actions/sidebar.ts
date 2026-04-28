"use server";
import supabase from "@/lib/db";

/**
 * Interface representing the numerical badges/counters shown in the navigation sidebar.
 */
export interface SidebarCounts {
  customers: number;
  products: number;
  inventory: number;
  sales: number;
  quotas: number;
  visits: number;
  buyerRequests: number;
  bookings: number;
  orders: number;
  callsheets: number;
  [key: string]: number;
}

/**
 * Fetches accurate record counts for all major entities in a single parallel operation.
 * Used to populate the notification badges on the side navigation menu.
 */
export async function getSidebarCounts(): Promise<SidebarCounts> {
  try {
    // Perform multiple "head" queries (metadata only) to get counts without fetching actual row data
    const [customers, products, sales, quotas, visits, buyerRequests] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_active", true).then(r => r.count || 0),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true).then(r => r.count || 0),
      supabase.from("sales_transactions").select("*", { count: "exact", head: true }).then(r => r.count || 0),
      supabase.from("salesman_quotas").select("*", { count: "exact", head: true }).eq("status", "ongoing").then(r => r.count || 0),
      supabase.from("store_visits").select("*", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("buyer_requests").select("*", { count: "exact", head: true }).eq("status", "pending").then(r => r.count || 0, () => 0),
    ]);

    return {
      customers: Number(customers),
      products: Number(products),
      inventory: 0,
      sales: Number(sales),
      quotas: Number(quotas),
      visits: Number(visits),
      buyerRequests: Number(buyerRequests),
      bookings: 0,
      orders: 0,
      callsheets: 0,
    };
  } catch (error) {
    console.error("Error fetching sidebar counts:", error);
    return { customers: 0, products: 0, inventory: 0, sales: 0, quotas: 0, visits: 0, buyerRequests: 0, bookings: 0, orders: 0, callsheets: 0 };
  }
}
