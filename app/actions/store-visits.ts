"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";

export interface CreateStoreVisitInput {
  customer_id: string;
  salesman_id: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

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
    revalidatePath("/salesman/dashboard");
    revalidatePath("/salesman/visits");
    return { success: true, data: { id: visitId } };
  } catch (error: any) {
    console.error("createStoreVisit error:", error);
    return { success: false, error: error.message };
  }
}

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
