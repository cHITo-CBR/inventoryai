"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";

export interface CustomerRow {
  id: string;
  store_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  salesman_name?: string | null;
}

export interface CustomerStats {
  totalActive: number;
  newThisMonth: number;
}

export async function getCustomers(): Promise<CustomerRow[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*, users:assigned_salesman_id(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((c: any) => ({
      ...c,
      salesman_name: c.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function getCustomerStats(): Promise<CustomerStats> {
  try {
    const { count: totalActive } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    return {
      totalActive: totalActive ?? 0,
      newThisMonth: newThisMonth ?? 0,
    };
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return { totalActive: 0, newThisMonth: 0 };
  }
}

export async function createCustomer(formData: FormData) {
  const storeName = formData.get("storeName") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const region = formData.get("region") as string;
  const assignedSalesmanId = formData.get("assignedSalesmanId") as string;

  if (!storeName) return { error: "Store name is required." };

  try {
    const { error } = await supabase.from("customers").insert({
      id: generateUUID(),
      store_name: storeName,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      region: region || null,
      assigned_salesman_id: assignedSalesmanId || null,
      is_active: true,
    });

    if (error) throw error;
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create customer." };
  }
}

export async function getSalesmenForAssignment(): Promise<{ id: string; full_name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching salesmen:", error);
    return [];
  }
}



export async function getSalesmanCustomers(salesmanId: string): Promise<CustomerRow[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*, users:assigned_salesman_id(full_name)")
      .eq("assigned_salesman_id", salesmanId)
      .eq("is_active", true)
      .order("store_name");
    if (error) throw error;
    return (data || []).map((c: any) => ({
      ...c,
      salesman_name: c.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching salesman customers:", error);
    return [];
  }
}

export async function getUnassignedCustomers(): Promise<CustomerRow[]> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .is("assigned_salesman_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((c: any) => ({ ...c, salesman_name: null }));
  } catch (error) {
    console.error("Error fetching unassigned customers:", error);
    return [];
  }
}

export async function assignCustomerToSalesman(customerId: string, salesmanId: string) {
  try {
    const { error } = await supabase
      .from("customers")
      .update({ assigned_salesman_id: salesmanId })
      .eq("id", customerId);
    if (error) throw error;
    revalidatePath("/salesman/customers");
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to assign customer." };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  const storeName = formData.get("storeName") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const region = formData.get("region") as string;
  // Note: we can optionally update assignedSalesmanId too, but let's stick to base details

  if (!id) return { error: "Customer ID is required." };
  if (!storeName) return { error: "Store name is required." };

  try {
    const { error } = await supabase
      .from("customers")
      .update({
        store_name: storeName,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        region: region || null,
      })
      .eq("id", id);

    if (error) throw error;
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update customer." };
  }
}
