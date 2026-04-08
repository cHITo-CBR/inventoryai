"use server";
import { query } from "@/lib/db-helpers";
import { RowDataPacket } from "mysql2/promise";
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

interface BookingRowDB extends RowDataPacket {
  id: string;
  salesman_id: string;
  customer_id: string | null;
  customer_store_name: string | null;
  total_amount: string;
  status: "pending" | "approved" | "completed" | "cancelled";
  created_at: string;
  updated_at: string | null;
}

// Get bookings for current salesman
export async function getSalesmanBookings(): Promise<BookingRow[]> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return [];
    }

    const bookings = await query<BookingRowDB>(`
      SELECT 
        st.id,
        st.salesman_id,
        st.customer_id,
        c.store_name as customer_store_name,
        st.total_amount,
        st.status,
        st.created_at,
        st.updated_at
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE st.salesman_id = ?
      ORDER BY st.created_at DESC
    `, [session.user.id]);

    return bookings.map(b => ({
      ...b,
      total_amount: parseFloat(b.total_amount)
    }));
  } catch (error) {
    console.error("Error fetching salesman bookings:", error);
    return [];
  }
}

// Get specific booking details
export async function getBookingById(id: string): Promise<BookingRow | null> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return null;
    }

    const booking = await query<BookingRowDB>(`
      SELECT 
        st.id,
        st.salesman_id,
        st.customer_id,
        c.store_name as customer_store_name,
        st.total_amount,
        st.status,
        st.created_at,
        st.updated_at
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE st.id = ? AND st.salesman_id = ?
      LIMIT 1
    `, [id, session.user.id]);

    if (booking.length === 0) return null;

    const b = booking[0];
    return {
      ...b,
      total_amount: parseFloat(b.total_amount)
    };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
}

// Create new booking (transaction)
export async function createBooking(formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const customer_id = formData.get("customer_id") as string;
    const total_amount = formData.get("total_amount") as string;

    if (!customer_id || !total_amount) {
      return { error: "Customer and total amount are required" };
    }

    const bookingId = crypto.randomUUID();
    
    await query(`
      INSERT INTO sales_transactions (id, salesman_id, customer_id, total_amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [
      bookingId,
      session.user.id,
      customer_id,
      parseFloat(total_amount)
    ]);

    return { success: true, booking_id: bookingId };
  } catch (error) {
    console.error("Error creating booking:", error);
    return { error: "Failed to create booking" };
  }
}

// Update booking status
export async function updateBookingStatus(id: string, status: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await query(`
      UPDATE sales_transactions 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND salesman_id = ?
    `, [status, id, session.user.id]);

    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { error: "Failed to update booking status" };
  }
}