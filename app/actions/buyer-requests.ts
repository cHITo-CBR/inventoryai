"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";

export interface BuyerRequestItemInput {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateBuyerRequestInput {
  salesman_id: string;
  customer_id: string;
  notes?: string;
  items: BuyerRequestItemInput[];
}

export async function createBuyerRequest(input: CreateBuyerRequestInput) {
  try {
    const requestId = generateUUID();

    const { error: reqError } = await supabase.from("buyer_requests").insert({
      id: requestId,
      salesman_id: input.salesman_id,
      customer_id: input.customer_id,
      notes: input.notes || null,
      status: "pending",
    });
    if (reqError) throw reqError;

    if (input.items.length > 0) {
      const itemRows = input.items.map((item) => ({
        id: generateUUID(),
        request_id: requestId,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes || null,
      }));
      await supabase.from("buyer_request_items").insert(itemRows);
    }

    revalidatePath("/salesman/dashboard");
    revalidatePath("/salesman/requests");
    return { success: true, data: { id: requestId } };
  } catch (error: any) {
    console.error("createBuyerRequest error:", error);
    return { success: false, error: error.message };
  }
}

export async function getSalesmanBuyerRequests(salesmanId: string) {
  try {
    const { data: requests, error } = await supabase
      .from("buyer_requests")
      .select("*, customers(store_name)")
      .eq("salesman_id", salesmanId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const requestIds = (requests || []).map((r: any) => r.id);
    let itemsMap = new Map<string, any[]>();

    if (requestIds.length > 0) {
      const { data: items } = await supabase
        .from("buyer_request_items")
        .select("*, products(name)")
        .in("request_id", requestIds);

      for (const item of (items || [])) {
        if (!itemsMap.has(item.request_id)) itemsMap.set(item.request_id, []);
        itemsMap.get(item.request_id)!.push({
          ...item,
          products: item.products || null,
        });
      }
    }

    return {
      success: true,
      data: (requests || []).map((r: any) => ({
        ...r,
        customers: r.customers || null,
        buyer_request_items: itemsMap.get(r.id) || [],
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllBuyerRequests() {
  try {
    const { data: requests } = await supabase
      .from("buyer_requests")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .order("created_at", { ascending: false });

    const requestIds = (requests || []).map((r: any) => r.id);
    let itemsMap = new Map<string, any[]>();

    if (requestIds.length > 0) {
      const { data: items } = await supabase
        .from("buyer_request_items")
        .select("*, products(name)")
        .in("request_id", requestIds);

      for (const item of (items || [])) {
        if (!itemsMap.has(item.request_id)) itemsMap.set(item.request_id, []);
        itemsMap.get(item.request_id)!.push({
          ...item,
          products: item.products || null,
        });
      }
    }

    return (requests || []).map((r: any) => ({
      ...r,
      customers: r.customers || null,
      users: r.users || null,
      buyer_request_items: itemsMap.get(r.id) || [],
    }));
  } catch (error: any) {
    console.error("getAllBuyerRequests error:", error);
    return [];
  }
}

export async function updateBuyerRequestStatus(requestId: string, status: string) {
  try {
    const { error } = await supabase
      .from("buyer_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) throw error;
    revalidatePath("/buyer-requests");
    revalidatePath("/salesman/requests");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
