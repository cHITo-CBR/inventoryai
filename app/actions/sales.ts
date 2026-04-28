"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";
import { notifyRole, createNotification } from "@/app/actions/notifications";

/**
 * Interface representing a high-level summary of a sales transaction.
 */
export interface SalesTransactionRow {
  id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customers: { store_name: string } | null;
  users: { full_name: string } | null;
}

/**
 * Interface representing a specific item within a sale.
 */
export interface SaleDetailItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_variants: { name: string; sku: string | null } | null;
}

/**
 * Interface representing the complete expanded details of a sale.
 */
export interface SaleDetail {
  id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customers: { store_name: string } | null;
  users: { full_name: string } | null;
  sales_transaction_items: SaleDetailItem[];
}

/**
 * Fetches all sales transactions in reverse chronological order.
 * Joins with customers and users to provide descriptive names in the UI.
 */
export async function getSalesTransactions(): Promise<SalesTransactionRow[]> {
  try {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, notes, created_at, customers(store_name), users(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      status: row.status,
      total_amount: row.total_amount,
      notes: row.notes,
      created_at: row.created_at,
      customers: row.customers || null,
      users: row.users || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches expanded details for a specific transaction including its line items.
 */
export async function getSaleDetails(id: string): Promise<SaleDetail | null> {
  try {
    // 1. Fetch the transaction header
    const { data: transaction, error } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, notes, created_at, customers(store_name), users(full_name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!transaction) return null;

    // 2. Fetch all individual product items in this transaction
    const { data: items } = await supabase
      .from("sales_transaction_items")
      .select("id, quantity, unit_price, subtotal, product_variants(name, sku)")
      .eq("transaction_id", id);

    const t = transaction as any;
    return {
      ...t,
      customers: t.customers || null,
      users: t.users || null,
      sales_transaction_items: (items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        product_variants: item.product_variants || null,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Generates a raw CSV string of all sales transactions for data export.
 */
export async function exportSalesCSV(): Promise<string> {
  try {
    const { data: rows } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, created_at, customers(store_name), users(full_name)")
      .order("created_at", { ascending: false });

    if (!rows || rows.length === 0) return "";

    const headers = ["Transaction ID", "Date", "Customer", "Sales Rep", "Total Amount", "Status"];
    const csvRows = rows.map((t: any) => [
      t.id,
      new Date(t.created_at).toLocaleDateString(),
      t.customers?.store_name ?? "N/A",
      t.users?.full_name ?? "N/A",
      t.total_amount ?? 0,
      t.status,
    ]);

    return [headers.join(","), ...csvRows.map((r: any) => r.join(","))].join("\n");
  } catch {
    return "";
  }
}

export interface BookingItemInput {
  variant_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateBookingInput {
  customer_id: string;
  salesman_id: string;
  notes?: string;
  items: BookingItemInput[];
}

/**
 * Core business logic for creating a new booking/order.
 * 1. Calculates the total financial volume.
 * 2. Creates the transaction header.
 * 3. Records the individual items.
 * 4. CRITICAL: Deducts stock levels IMMEDIATELY to prevent overselling.
 * 5. Notifies admins and supervisors.
 */
export async function createBooking(input: CreateBookingInput) {
  try {
    const { customer_id, salesman_id, notes, items } = input;
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const transactionId = generateUUID();
    
    // 1. Register the high-level sale record
    const { error: txError } = await supabase.from("sales_transactions").insert({
      id: transactionId,
      customer_id,
      salesman_id,
      total_amount,
      notes: notes || null,
      status: "pending",
    });
    if (txError) throw txError;

    // 2. Register line items and adjust physical inventory
    if (items.length > 0) {
      const itemRows = items.map((item) => ({
        id: generateUUID(),
        transaction_id: transactionId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }));
      
      const { error: itemsError } = await supabase.from("sales_transaction_items").insert(itemRows);
      if (itemsError) throw itemsError;

      // INVENTORY REDUCTION LOGIC
      // We process each item and update the master product case count
      for (const item of items) {
        // Find which product this specific variant belongs to
        const { data: variant, error: vError } = await supabase
          .from("product_variants")
          .select("product_id")
          .eq("id", item.variant_id)
          .single();

        if (vError || !variant) continue;

        // Fetch current physical case count
        const { data: product, error: pError } = await supabase
          .from("products")
          .select("total_cases")
          .eq("id", variant.product_id)
          .single();

        if (pError || !product) continue;

        // Perform the subtraction and save back to the DB
        const currentCases = product.total_cases || 0;
        const newCases = currentCases - item.quantity;
        
        await supabase
          .from("products")
          .update({ total_cases: newCases })
          .eq("id", variant.product_id);
      }
    }

    // 3. Broadcast notifications to management
    await notifyRole("admin", "New Order Created", `A new order has been placed.`);
    await notifyRole("supervisor", "New Order Created", `A new order has been placed.`);

    // 4. Force global cache invalidation for all related dashboards
    revalidatePath("/salesman/dashboard");
    revalidatePath("/bookings");
    revalidatePath("/notifications");
    revalidatePath("/sales");
    revalidatePath("/admin/sales");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/catalog/products");
    revalidatePath("/supervisor/catalog/products");
    
    return { success: true, data: { id: transactionId } };

  } catch (error: any) {
    console.error("createBooking error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves all bookings with expanded relationships for the administration panel.
 */
export async function getAllBookings() {
  try {
    const { data: transactions } = await supabase
      .from("sales_transactions")
      .select("*, customers(store_name), users(full_name)")
      .order("created_at", { ascending: false });

    if (!transactions || transactions.length === 0) return [];

    const transactionIds = transactions.map((t: any) => t.id);
    const { data: items } = await supabase
      .from("sales_transaction_items")
      .select("*, product_variants(name, sku)")
      .in("transaction_id", transactionIds);

    // Map items to their respective transactions efficiently
    const itemsMap = new Map<string, any[]>();
    for (const item of (items || [])) {
      if (!itemsMap.has(item.transaction_id)) itemsMap.set(item.transaction_id, []);
      itemsMap.get(item.transaction_id)!.push({
        ...item,
        product_variants: item.product_variants || null,
      });
    }

    return transactions.map((t: any) => ({
      id: t.id,
      customer_id: t.customer_id,
      salesman_id: t.salesman_id,
      status: t.status,
      total_amount: t.total_amount,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
      customers: t.customers || null,
      users: t.users || null,
      sales_transaction_items: itemsMap.get(t.id) || [],
    }));
  } catch (error: any) {
    console.error("getAllBookings error:", error);
    return [];
  }
}

/**
 * Updates the lifecycle status of a booking (e.g., Pending -> Approved).
 * INVENTORY RESTORATION: If an order is CANCELLED, this function adds back the stock.
 */
export async function updateBookingStatus(transactionId: string, status: string) {
  try {
    // 1. Verify current status before updating (prevents redundant processing)
    const { data: currentTx, error: fetchError } = await supabase
      .from("sales_transactions")
      .select("status, salesman_id")
      .eq("id", transactionId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Perform the database update
    const { error: updateError } = await supabase
      .from("sales_transactions")
      .update({ status })
      .eq("id", transactionId);
      
    if (updateError) throw updateError;

    // Notify the salesman about the status change
    if (currentTx?.salesman_id && currentTx.status !== status) {
      await createNotification(
        currentTx.salesman_id,
        "Order Status Updated",
        `Your order has been updated to: ${status.toUpperCase()}.`,
        status === "cancelled" ? "warning" : "success"
      );
    }

    /**
     * INVENTORY RESTORATION LOGIC
     * Since inventory is deducted immediately upon creation,
     * we must "UNDO" that deduction if the order is officially CANCELLED.
     */
    const isNowCancelled = status.toLowerCase() === "cancelled";
    const wasAlreadyCancelled = currentTx?.status?.toLowerCase() === "cancelled";

    if (isNowCancelled && !wasAlreadyCancelled) {
      // Find all items associated with this cancelled sale
      const { data: items, error: itemsError } = await supabase
        .from("sales_transaction_items")
        .select("variant_id, quantity")
        .eq("transaction_id", transactionId);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        for (const item of items) {
          // Find parent product
          const { data: variant, error: vError } = await supabase
            .from("product_variants")
            .select("product_id")
            .eq("id", item.variant_id)
            .single();

          if (vError || !variant) continue;

          // Fetch current stock levels
          const { data: product, error: pError } = await supabase
            .from("products")
            .select("total_cases")
            .eq("id", variant.product_id)
            .single();

          if (pError || !product) continue;

          // RESTORE stock by adding the quantity back
          const oldStock = product.total_cases || 0;
          const newStock = oldStock + item.quantity;

          await supabase
            .from("products")
            .update({ total_cases: newStock })
            .eq("id", variant.product_id);
        }
      }
    }

    // 3. Clear all related UI caches
    revalidatePath("/bookings");
    revalidatePath("/sales");
    revalidatePath("/notifications");
    revalidatePath("/admin/sales");
    revalidatePath("/admin/orders");
    revalidatePath("/salesman/bookings");
    revalidatePath("/admin/catalog/products");
    revalidatePath("/supervisor/catalog/products");
    
    return { success: true };
  } catch (error: any) {
    console.error("updateBookingStatus error:", error);
    return { success: false, error: error.message };
  }
}




