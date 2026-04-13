"use server";

/**
 * BOOKINGS ACTIONS
 * This file handles server-side operations for sales bookings (transactions).
 * It allows salesmen to view their transactions, create new ones, and update statuses.
 */

import supabase from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Interface representing a single booking record from the database.
 */
export interface BookingRow {
  id: string;
  salesman_id: string;
  customer_id: string | null;
  customer_store_name: string | null; // Joined from customers table
  total_amount: number;
  status: "pending" | "approved" | "completed" | "cancelled";
  created_at: string;
  updated_at: string | null;
}

/**
 * Retrieves all bookings for the currently logged-in salesman.
 * 1. Checks current user session
 * 2. Fetches transactions from 'sales_transactions' table
 * 3. Joins with 'customers' table to get the store name
 */
export async function getSalesmanBookings(): Promise<BookingRow[]> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return []; // Ensure user is authenticated

    // Query database with joins and ordering
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, salesman_id, customer_id, total_amount, status, created_at, updated_at, customers(store_name)")
      .eq("salesman_id", session.user.id) // Only get bookings for THIS salesman
      .order("created_at", { ascending: false }); // Newest first

    if (error) throw error;

    // Map and format the data for the UI
    return (data || []).map((b: any) => ({
      ...b,
      customer_store_name: b.customers?.store_name || null,
      total_amount: Number(b.total_amount),
    }));
  } catch (error) {
    console.error("Error fetching salesman bookings:", error);
    return [];
  }
}

/**
 * Fetches a single booking details by its ID.
 */
export async function getBookingById(id: string): Promise<BookingRow | null> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, salesman_id, customer_id, total_amount, status, created_at, updated_at, customers(store_name)")
      .eq("id", id)
      .eq("salesman_id", session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as any;
    return {
      ...row,
      customer_store_name: row.customers?.store_name || null,
      total_amount: Number(row.total_amount),
    };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
}

/**
 * Creates a new booking transaction.
 * Usually called from a new booking form submissions.
 */
export async function createBooking(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const customer_id = formData.get("customer_id") as string;
    const total_amount = formData.get("total_amount") as string;

    if (!customer_id || !total_amount) {
      return { error: "Customer and total amount are required" };
    }

    const bookingId = crypto.randomUUID(); // Generate unique ID for the transaction

    // Insert the new transaction record
    const { error } = await supabase.from("sales_transactions").insert({
      id: bookingId,
      salesman_id: session.user.id,
      customer_id,
      total_amount: parseFloat(total_amount),
      status: "pending", // Default status for new bookings
    });

    if (error) throw error;
    return { success: true, booking_id: bookingId };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { error: "Failed to create booking" };
  }
}

/**
 * Updates the status of an existing booking.
 * @param id - The booking ID
 * @param status - The new status (e.g., 'cancelled')
 */
export async function updateBookingStatus(id: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("sales_transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("salesman_id", session.user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { error: "Failed to update booking status" };
  }
}