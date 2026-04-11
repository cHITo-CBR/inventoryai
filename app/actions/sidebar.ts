"use server";
import supabase from "@/lib/db";

export async function getSidebarCounts() {
  try {
    const [customers, products, sales, quotas, visits, buyerRequests, notifications] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_active", true).then(r => r.count || 0),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true).then(r => r.count || 0),
      supabase.from("sales_transactions").select("*", { count: "exact", head: true }).then(r => r.count || 0),
      supabase.from("salesman_quotas").select("*", { count: "exact", head: true }).eq("status", "ongoing").then(r => r.count || 0),
      supabase.from("store_visits").select("*", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("buyer_requests").select("*", { count: "exact", head: true }).eq("status", "pending").then(r => r.count || 0, () => 0),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false).then(r => r.count || 0, () => 0),
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
      notifications: Number(notifications),
    };
  } catch (error) {
    console.error("Error fetching sidebar counts:", error);
    return { customers: 0, products: 0, inventory: 0, sales: 0, quotas: 0, visits: 0, buyerRequests: 0, bookings: 0, notifications: 0 };
  }
}
