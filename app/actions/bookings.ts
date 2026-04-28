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
 * Used for typing throughout the salesman dashboard.
 */
export interface BookingRow {
  id: string;
  salesman_id: string;
  customer_id: string | null;
  customer_store_name: string | null; // Joined from the customers table
  total_amount: number;
  status: "pending" | "approved" | "completed" | "cancelled";
  created_at: string;
  updated_at: string | null;
}

/**
 * Retrieves all bookings for the currently logged-in salesman.
 * 1. Checks current user session to identify the salesman.
 * 2. Fetches transactions from 'sales_transactions' table.
 * 3. Joins with 'customers' table to get the human-readable store name.
 */
export async function getSalesmanBookings(): Promise<BookingRow[]> {
  try {
    const session = await getSession();
    // Security check: Ensure the user is authenticated before fetching data
    if (!session?.user?.id) return [];

    // Query database with joins and descending order (newest first)
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, salesman_id, customer_id, total_amount, status, created_at, updated_at, customers(store_name)")
      .eq("salesman_id", session.user.id) // Authorization filter
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Format the result to include the joined store name and numeric amounts
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
 * Fetches a single booking's details by its ID.
 * Ensures that the booking belongs to the requesting salesman.
 */
export async function getBookingById(id: string): Promise<BookingRow | null> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, salesman_id, customer_id, total_amount, status, created_at, updated_at, customers(store_name)")
      .eq("id", id)
      .eq("salesman_id", session.user.id) // Ensure salesman owns this record
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
 * Creates a new sales booking transaction.
 * Usually triggered when a salesman submits the 'New Booking' form.
 */
export async function createBooking(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const customer_id = formData.get("customer_id") as string;
    const total_amount = formData.get("total_amount") as string;

    // Validate that required form data is present
    if (!customer_id || !total_amount) {
      return { error: "Customer and total amount are required" };
    }

    // Generate a unique identifier for this transaction
    const bookingId = crypto.randomUUID();

    // Insert the new record into the sales transactions table
    const { error } = await supabase.from("sales_transactions").insert({
      id: bookingId,
      salesman_id: session.user.id,
      customer_id,
      total_amount: parseFloat(total_amount),
      status: "pending", // All new bookings start as pending until fulfilled
    });

    if (error) throw error;
    return { success: true, booking_id: bookingId };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { error: "Failed to create booking" };
  }
}

/**
 * Updates the status of an existing booking (e.g., cancelling it).
 * @param id - The ID of the transaction to update.
 * @param status - The new status to apply.
 */
export async function updateBookingStatus(id: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("sales_transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("salesman_id", session.user.id); // Ensure authorization

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { error: "Failed to update booking status" };
  }
}