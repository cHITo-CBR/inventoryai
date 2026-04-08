"use server";
import { query } from "@/lib/db-helpers";

export interface SidebarCounts {
  customers: number;
  products: number;
  inventory: number;
  sales: number;
  quotas: number;
  visits: number;
  callsheets: number;
  buyerRequests: number;
  bookings: number;
  notifications: number;
}

export async function getSidebarCounts(): Promise<SidebarCounts> {
  try {
    const [
      customers,
      products,
      inventory,
      sales,
      quotas,
      visits,
      callsheets,
      buyerRequests,
      bookings,
      notifications
    ] = await Promise.all([
      query<any>("SELECT COUNT(*) as count FROM customers WHERE is_active = 1").then(r => r[0]?.count || 0),
      query<any>("SELECT COUNT(*) as count FROM products WHERE is_active = 1").then(r => r[0]?.count || 0),
      query<any>("SELECT COUNT(*) as count FROM inventory").then(r => r[0]?.count || 0),
      query<any>("SELECT COUNT(*) as count FROM sales_transactions").then(r => r[0]?.count || 0),
      query<any>("SELECT COUNT(*) as count FROM salesman_quotas WHERE status = 'ongoing'").then(r => r[0]?.count || 0),
      query<any>("SELECT COUNT(*) as count FROM store_visits").then(r => r[0]?.count || 0).catch(() => 0),
      query<any>("SELECT COUNT(*) as count FROM callsheets").then(r => r[0]?.count || 0).catch(() => 0),
      query<any>("SELECT COUNT(*) as count FROM buyer_requests WHERE status = 'pending'").then(r => r[0]?.count || 0).catch(() => 0),
      query<any>("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").then(r => r[0]?.count || 0).catch(() => 0),
      query<any>("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0").then(r => r[0]?.count || 0).catch(() => 0),
    ]);

    return {
      customers: Number(customers),
      products: Number(products),
      inventory: Number(inventory),
      sales: Number(sales),
      quotas: Number(quotas),
      visits: Number(visits),
      callsheets: Number(callsheets),
      buyerRequests: Number(buyerRequests),
      bookings: Number(bookings),
      notifications: Number(notifications),
    };
  } catch (error) {
    console.error("Error fetching sidebar counts:", error);
    return {
      customers: 0,
      products: 0,
      inventory: 0,
      sales: 0,
      quotas: 0,
      visits: 0,
      callsheets: 0,
      buyerRequests: 0,
      bookings: 0,
      notifications: 0,
    };
  }
}
