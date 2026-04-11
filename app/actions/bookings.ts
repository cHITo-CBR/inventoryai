"use server";
import supabase from "@/lib/db";
import { getSession } from "@/lib/session";

export interface BookingRow {
  id: string;
  salesman_id: string;
  customer_id: string | null;
  customer_store_name: string | null;
  total_amount: number;
  status: "pending" | "approved" | "completed" | "cancelled";
  created_at: string;
  updated_at: string | null;
}

export async function getSalesmanBookings(): Promise<BookingRow[]> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, salesman_id, customer_id, total_amount, status, created_at, updated_at, customers(store_name)")
      .eq("salesman_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

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

export async function createBooking(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const customer_id = formData.get("customer_id") as string;
    const total_amount = formData.get("total_amount") as string;

    if (!customer_id || !total_amount) {
      return { error: "Customer and total amount are required" };
    }

    const bookingId = crypto.randomUUID();

    const { error } = await supabase.from("sales_transactions").insert({
      id: bookingId,
      salesman_id: session.user.id,
      customer_id,
      total_amount: parseFloat(total_amount),
      status: "pending",
    });

    if (error) throw error;
    return { success: true, booking_id: bookingId };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { error: "Failed to create booking" };
  }
}

export async function updateBookingStatus(id: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("sales_transactions")
      .update({ status })
      .eq("id", id)
      .eq("salesman_id", session.user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { error: "Failed to update booking status" };
  }
}