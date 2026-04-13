"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";
import { notifyRole, createNotification } from "@/app/actions/notifications";

export interface SalesTransactionRow {
  id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customers: { store_name: string } | null;
  users: { full_name: string } | null;
}

export interface SaleDetailItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_variants: { name: string; sku: string | null } | null;
}

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

export async function getSaleDetails(id: string): Promise<SaleDetail | null> {
  try {
    const { data: transaction, error } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, notes, created_at, customers(store_name), users(full_name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!transaction) return null;

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

export async function createBooking(input: CreateBookingInput) {
  try {
    const { customer_id, salesman_id, notes, items } = input;
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const transactionId = generateUUID();
    
    // 1. Create the sales transaction record
    const { error: txError } = await supabase.from("sales_transactions").insert({
      id: transactionId,
      customer_id,
      salesman_id,
      total_amount,
      notes: notes || null,
      status: "pending",
    });
    if (txError) throw txError;

    // 2. Insert transaction items and immediately deduct inventory
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

      // INVENTORY REDUCTION LOGIC (IMMEDIATE)
      console.log(`[Inventory] Deducting stock for new booking ${transactionId}`);
      for (const item of items) {
        // A. Find product ID for this variant
        const { data: variant, error: vError } = await supabase
          .from("product_variants")
          .select("product_id")
          .eq("id", item.variant_id)
          .single();

        if (vError || !variant) continue;

        // B. Get current stock
        const { data: product, error: pError } = await supabase
          .from("products")
          .select("total_cases")
          .eq("id", variant.product_id)
          .single();

        if (pError || !product) continue;

        // C. Subtract and update
        const currentCases = product.total_cases || 0;
        const newCases = currentCases - item.quantity;
        
        await supabase
          .from("products")
          .update({ total_cases: newCases })
          .eq("id", variant.product_id);
      }
    }

    // 3. Dispatch Notifications
    await notifyRole("admin", "New Order Created", `A new order has been placed by Salesman.`);
    await notifyRole("supervisor", "New Order Created", `A new order has been placed by Salesman.`);

    // 4. Clear caches for everyone
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

export async function updateBookingStatus(transactionId: string, status: string) {
  try {
    console.log(`[Inventory] Updating transaction ${transactionId} to ${status}`);

    // 1. Fetch current status to check transition (Prevents double deduction)
    const { data: currentTx, error: fetchError } = await supabase
      .from("sales_transactions")
      .select("status, salesman_id")
      .eq("id", transactionId)
      .single();

    if (fetchError) {
      console.error("[Inventory] Failed to fetch current transaction status:", fetchError);
      throw fetchError;
    }

    console.log(`[Inventory] Current status is: ${currentTx?.status}`);

    // 2. Perform the status update in the DB
    const { error: updateError } = await supabase
      .from("sales_transactions")
      .update({ status })
      .eq("id", transactionId);
      
    if (updateError) {
      console.error("[Inventory] Failed to update transaction status:", updateError);
      throw updateError;
    }

    // -> Notify the Salesman!
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
     * Since inventory is now deducted immediately upon creation,
     * we only need to act here if the order is CANCELLED.
     */
    const isNowCancelled = status.toLowerCase() === "cancelled";
    const wasAlreadyCancelled = currentTx?.status?.toLowerCase() === "cancelled";

    if (isNowCancelled && !wasAlreadyCancelled) {
      console.log(`[Inventory] Status changed to CANCELLED. Restoring deduction...`);

      // A. Fetch all items for this transaction
      const { data: items, error: itemsError } = await supabase
        .from("sales_transaction_items")
        .select("variant_id, quantity")
        .eq("transaction_id", transactionId);

      if (itemsError) {
        console.error("[Inventory] Failed to fetch transaction items:", itemsError);
        throw itemsError;
      }

      if (items && items.length > 0) {
        for (const item of items) {
          // B. Get the parent product_id from the variant
          const { data: variant, error: vError } = await supabase
            .from("product_variants")
            .select("product_id")
            .eq("id", item.variant_id)
            .single();

          if (vError || !variant) continue;

          // C. Get current stock
          const { data: product, error: pError } = await supabase
            .from("products")
            .select("total_cases")
            .eq("id", variant.product_id)
            .single();

          if (pError || !product) continue;

          // D. Add back to stock
          const oldStock = product.total_cases || 0;
          const newStock = oldStock + item.quantity; // <-- PLUS here!

          await supabase
            .from("products")
            .update({ total_cases: newStock })
            .eq("id", variant.product_id);
            
          console.log(`[Inventory] Restored ${item.quantity} cases to product ${variant.product_id}.`);
        }
      }
    }

    // 3. Clear all potential caches
    revalidatePath("/bookings");
    revalidatePath("/sales");
    revalidatePath("/notifications");
    revalidatePath("/admin/sales");
    revalidatePath("/admin/orders");
    revalidatePath("/salesman/bookings");
    revalidatePath("/admin/catalog/products");
    revalidatePath("/supervisor/catalog/products");
    
    console.log(`[Inventory] Update process finished for ${transactionId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Inventory] CRITICAL ERROR in updateBookingStatus:", error);
    return { success: false, error: error.message };
  }
}




