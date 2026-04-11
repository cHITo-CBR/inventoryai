"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";

// ══════════════════════════════════════════════════════════════
// BUYER DASHBOARD
// ══════════════════════════════════════════════════════════════

export async function getBuyerDashboard(userId: string) {
  try {
    // Recent requests
    const { data: requests } = await supabase
      .from("buyer_requests")
      .select("*")
      .eq("salesman_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const requestIds = (requests || []).map((r: any) => r.id);
    let requestItemsMap = new Map<string, any[]>();
    if (requestIds.length > 0) {
      const { data: items } = await supabase
        .from("buyer_request_items")
        .select("*, products(name)")
        .in("request_id", requestIds);

      for (const item of (items || [])) {
        if (!requestItemsMap.has(item.request_id)) requestItemsMap.set(item.request_id, []);
        requestItemsMap.get(item.request_id)!.push({
          ...item,
          products: item.products || null,
        });
      }
    }

    // Recent orders
    const { data: orders } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, created_at, customers(store_name)")
      .eq("salesman_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Featured products
    const { data: products } = await supabase
      .from("products")
      .select("*, product_categories(name), brands(name)")
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(6);

    return {
      recentRequests: (requests || []).map((r: any) => ({
        ...r,
        buyer_request_items: requestItemsMap.get(r.id) || [],
      })),
      recentOrders: (orders || []).map((o: any) => ({
        ...o,
        customers: o.customers || null,
      })),
      featuredProducts: (products || []).map((p: any) => ({
        ...p,
        product_categories: p.product_categories || null,
        brands: p.brands || null,
        product_images: [],
      })),
    };
  } catch (error) {
    console.error("getBuyerDashboard error:", error);
    return { recentRequests: [], recentOrders: [], featuredProducts: [] };
  }
}

// ══════════════════════════════════════════════════════════════
// PRODUCT BROWSING
// ══════════════════════════════════════════════════════════════

export async function getBuyerProducts(search?: string, categoryId?: number, brandId?: number) {
  try {
    let query = supabase
      .from("products")
      .select("*, product_categories(name), brands(name)")
      .eq("is_active", true)
      .eq("is_archived", false);

    if (search) query = query.ilike("name", `%${search.toLowerCase()}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (brandId) query = query.eq("brand_id", brandId);

    query = query.order("name");
    const { data: products, error } = await query;
    if (error) throw error;

    const productIds = (products || []).map((p: any) => p.id);
    let variantsMap = new Map<string, any[]>();

    if (productIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, product_id, name, sku, unit_price, packaging_types(name), units(name)")
        .in("product_id", productIds);

      for (const v of (variants || []) as any[]) {
        if (!variantsMap.has(v.product_id)) variantsMap.set(v.product_id, []);
        variantsMap.get(v.product_id)!.push({
          id: v.id,
          name: v.name,
          sku: v.sku,
          unit_price: v.unit_price,
          packaging_type: v.packaging_types?.name || null,
          unit: v.units?.name || null,
        });
      }
    }

    return (products || []).map((p: any) => ({
      ...p,
      product_categories: p.product_categories || null,
      brands: p.brands || null,
      product_images: [],
      product_variants: variantsMap.get(p.id) || [],
    }));
  } catch (error) {
    console.error("getBuyerProducts error:", error);
    return [];
  }
}

export async function getProductDetail(productId: string) {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*, product_categories(name), brands(name)")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw error;
    if (!product) return null;

    const p = product as any;

    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, sku, unit_price, packaging_types(name), units(name)")
      .eq("product_id", productId);

    return {
      ...p,
      product_categories: p.product_categories || null,
      brands: p.brands || null,
      product_images: [],
      product_variants: (variants || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        unit_price: v.unit_price,
        packaging_types: v.packaging_types || null,
        units: v.units || null,
      })),
    };
  } catch (error) {
    console.error("getProductDetail error:", error);
    return null;
  }
}

export async function getProductFilters() {
  try {
    const [catRes, brandRes] = await Promise.all([
      supabase.from("product_categories").select("id, name").eq("is_archived", false).order("name"),
      supabase.from("brands").select("id, name").eq("is_archived", false).order("name"),
    ]);
    return {
      categories: catRes.data || [],
      brands: brandRes.data || [],
    };
  } catch (error) {
    console.error("getProductFilters error:", error);
    return { categories: [], brands: [] };
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER REQUESTS (buyer's own)
// ══════════════════════════════════════════════════════════════

export async function getBuyerOwnRequests(userId: string) {
  try {
    const { data: requests } = await supabase
      .from("buyer_requests")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .eq("salesman_id", userId)
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
  } catch (error) {
    console.error("getBuyerOwnRequests error:", error);
    return [];
  }
}

export async function createBuyerRequestFromBuyer(input: {
  customer_id: string;
  notes?: string;
  items: { product_id: string; quantity: number; notes?: string }[];
  userId: string;
}) {
  try {
    const requestId = generateUUID();

    const { error: reqError } = await supabase.from("buyer_requests").insert({
      id: requestId,
      salesman_id: input.userId,
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

    revalidatePath("/customers/buyer-requests");
    return { success: true, data: { id: requestId } };
  } catch (error: any) {
    console.error("createBuyerRequestFromBuyer error:", error);
    return { success: false, error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER ORDERS
// ══════════════════════════════════════════════════════════════

export async function getBuyerOrders(userId: string) {
  try {
    const { data: orders } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, notes, created_at, customers(store_name)")
      .eq("salesman_id", userId)
      .order("created_at", { ascending: false });

    const orderIds = (orders || []).map((o: any) => o.id);
    let itemsMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("sales_transaction_items")
        .select("*, product_variants(name, sku, products(name))")
        .in("transaction_id", orderIds);

      for (const item of (items || [])) {
        if (!itemsMap.has(item.transaction_id)) itemsMap.set(item.transaction_id, []);
        itemsMap.get(item.transaction_id)!.push({
          ...item,
          product_variants: item.product_variants || null,
        });
      }
    }

    return (orders || []).map((o: any) => ({
      ...o,
      customers: o.customers || null,
      sales_transaction_items: itemsMap.get(o.id) || [],
    }));
  } catch (error) {
    console.error("getBuyerOrders error:", error);
    return [];
  }
}

export async function getOrderDetail(orderId: string) {
  try {
    const { data: order } = await supabase
      .from("sales_transactions")
      .select("*, customers(store_name), users:salesman_id(full_name)")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return null;

    const { data: items } = await supabase
      .from("sales_transaction_items")
      .select("id, quantity, unit_price, subtotal, product_variants(name, sku, unit_price, products(name))")
      .eq("transaction_id", orderId);

    return {
      ...order,
      customers: order.customers || null,
      users: order.users || null,
      sales_transaction_items: (items || []).map((i: any) => ({
        id: i.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        product_variants: i.product_variants || null,
      })),
    };
  } catch (error) {
    console.error("getOrderDetail error:", error);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

export async function getBuyerNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER PROFILE
// ══════════════════════════════════════════════════════════════

export async function getBuyerProfile(userId: string) {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("assigned_salesman_id", userId)
      .maybeSingle();
    const favoritesCount = await getFavoriteCounts(userId);
    return { user, customer, favoritesCount };
  } catch {
    return { user: null, customer: null };
  }
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

export async function getCustomersForBuyer() {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id, store_name")
      .eq("is_active", true)
      .order("store_name");
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// BUYER FAVORITES
// ══════════════════════════════════════════════════════════════

export async function toggleFavorite(userId: string, productId: string) {
  try {
    const { data: existing } = await supabase
      .from("product_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      await supabase.from("product_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
      return { success: true, isFavorite: false };
    } else {
      await supabase.from("product_favorites").insert({
        user_id: userId,
        product_id: productId,
      });
      return { success: true, isFavorite: true };
    }
  } catch (error) {
    console.error("toggleFavorite error:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function getFavoriteCounts(userId: string) {
  try {
    const { count } = await supabase
      .from("product_favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getUserFavorites(userId: string) {
  try {
    const { data } = await supabase
      .from("product_favorites")
      .select("product_id")
      .eq("user_id", userId);
    return (data || []).map((r: any) => r.product_id);
  } catch {
    return [];
  }
}
