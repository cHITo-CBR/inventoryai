"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Interface representing inventory health indicators.
 */
export interface InventoryKPIs {
  totalSKUs: number;
  lowStockAlerts: number;
}

/**
 * Interface representing a row in the inventory ledger (movement history).
 */
export interface MovementRow {
  id: string;
  quantity: number;
  balance: number;
  notes: string | null;
  created_at: string;
  product_variants: { name: string; sku: string | null } | null;
  inventory_movement_types: { name: string; direction: string } | null;
  users: { full_name: string } | null;
}

/**
 * Fetches high-level inventory metrics.
 * 1. Counts active product variants.
 * 2. Counts ledger entries where balance is below critical levels.
 */
export async function getInventoryKPIs(): Promise<InventoryKPIs> {
  try {
    const { count: totalSKUs } = await supabase
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: lowStockAlerts } = await supabase
      .from("inventory_ledger")
      .select("*", { count: "exact", head: true })
      .lt("balance", 10);

    return {
      totalSKUs: totalSKUs ?? 0,
      lowStockAlerts: lowStockAlerts ?? 0,
    };
  } catch {
    return { totalSKUs: 0, lowStockAlerts: 0 };
  }
}

/**
 * Retrieves the 20 most recent inventory movements.
 * Joins products, movement types (In/Out), and the user who recorded the change.
 */
export async function getRecentMovements(): Promise<MovementRow[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_ledger")
      .select(`
        id, quantity, balance, notes, created_at,
        products:product_id(name, id),
        inventory_movement_types:movement_type_id(name, direction),
        users:recorded_by(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Flatten and format the results for table display
    return (data || []).map((row: any) => ({
      id: row.id,
      quantity: row.quantity,
      balance: row.balance,
      notes: row.notes,
      created_at: row.created_at,
      product_variants: row.products ? { name: row.products.name, sku: `SKU-${row.products.id?.substring(0, 8)}` } : null,
      inventory_movement_types: row.inventory_movement_types || null,
      users: row.users || null,
    }));
  } catch (error) {
    console.error("Error fetching recent movements:", error);
    return [];
  }
}

/**
 * Fetches available movement categories (e.g., 'Stock In', 'Stock Out', 'Damage').
 */
export async function getMovementTypes(): Promise<{ id: number; name: string; direction: string }[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_movement_types")
      .select("id, name, direction")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching movement types:", error);
    return [
      { id: 1, name: "Stock In", direction: "in" },
      { id: 2, name: "Stock Out", direction: "out" },
      { id: 3, name: "Adjustment In", direction: "in" },
      { id: 4, name: "Adjustment Out", direction: "out" },
    ];
  }
}

/**
 * Retrieves a list of active products for use in adjustment forms.
 */
export async function getVariantsForAdjustment(): Promise<{ id: string; name: string; sku: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .eq("is_archived", false)
      .order("name");

    if (error) throw error;

    return (data || []).map((v: any) => ({
      id: v.id,
      name: `${v.name} - Standard`,
      sku: `SKU-${v.id.substring(0, 8)}`,
    }));
  } catch (error) {
    console.error("Error fetching variants:", error);
    return [];
  }
}

/**
 * Records a new inventory adjustment entry.
 * 1. Fetches the current balance for the product.
 * 2. Calculates the new balance based on the movement direction (In/Out).
 * 3. Inserts a record into the 'inventory_ledger' table.
 * 4. Refreshes relevant cached pages.
 */
export async function createStockAdjustment(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const variantId = formData.get("variantId") as string;
  const movementTypeId = formData.get("movementTypeId") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const notes = formData.get("notes") as string;

  if (!variantId || !movementTypeId || !quantity) {
    return { error: "Missing required fields." };
  }

  try {
    // 1. Get the most recent balance for this product to calculate the next balance
    const { data: lastEntry } = await supabase
      .from("inventory_ledger")
      .select("balance")
      .eq("product_id", variantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastEntry?.balance ?? 0;

    // 2. Determine movement direction (add or subtract from balance)
    const { data: movType } = await supabase
      .from("inventory_movement_types")
      .select("direction")
      .eq("id", parseInt(movementTypeId))
      .maybeSingle();

    if (!movType) return { error: "Invalid movement type selected." };

    const direction = movType.direction;
    const newBalance = direction === "out" ? currentBalance - quantity : currentBalance + quantity;

    // 3. Insert the ledger entry
    const { error } = await supabase.from("inventory_ledger").insert({
      id: generateUUID(),
      product_id: variantId,
      movement_type_id: parseInt(movementTypeId),
      quantity: direction === "out" ? -quantity : quantity,
      balance: newBalance,
      notes: notes || null,
      recorded_by: session.user.id,
    });

    if (error) throw error;

    // 4. Force a UI refresh on all inventory screens
    revalidatePath("/admin/inventory");
    revalidatePath("/supervisor/inventory");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Stock adjustment error:", error);
    return { error: error.message };
  }
}
