"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";
import { notifyRole } from "@/app/actions/notifications";

/**
 * Interface representing the data required to log a physical salesman visit.
 */
export interface CreateStoreVisitInput {
  customer_id: string;
  salesman_id: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Records a physical visit to a store.
 * 1. Captures GPS coordinates for location verification (proof of presence).
 * 2. Notifies the supervisor that a new visit has been logged.
 * 3. Updates relevant dashboards.
 */
export async function createStoreVisit(input: CreateStoreVisitInput) {
  try {
    const visitId = generateUUID();
    const { error } = await supabase.from("store_visits").insert({
      id: visitId,
      customer_id: input.customer_id,
      salesman_id: input.salesman_id,
      notes: input.notes || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      visit_date: new Date().toISOString(),
    });

    if (error) throw error;

    // Trigger Notification for Supervisors to monitor field activity
    await notifyRole("supervisor", "New Store Visit Logged", `A salesman has logged a new store visit.`);

    revalidatePath("/salesman/dashboard");
    revalidatePath("/notifications");
    revalidatePath("/salesman/visits");
    return { success: true, data: { id: visitId } };
  } catch (error: any) {
    console.error("createStoreVisit error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves all physical visit logs for a specific salesman.
 */
export async function getSalesmanVisits(salesmanId: string) {
  try {
    const { data, error } = await supabase
      .from("store_visits")
      .select("*, customers(store_name, address)")
      .eq("salesman_id", salesmanId)
      .order("visit_date", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((v: any) => ({
        ...v,
        customers: v.customers || null,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
