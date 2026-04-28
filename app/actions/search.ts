"use server";
import supabase from "@/lib/db";

/**
 * Unified search result structure for the global search bar.
 */
export type SearchResult = {
  id: string;
  type: "product" | "customer" | "user" | "transaction";
  title: string;
  subtitle: string;
  url: string;
};

/**
 * Performs a global search across multiple entity tables (Products, Customers, Users).
 * 1. Checks if the query is long enough to prevent excessive DB load.
 * 2. Executes 'ilike' (case-insensitive) searches across targeted columns.
 * 3. Normalizes different DB structures into a common SearchResult format.
 */
export async function globalSearch(searchQuery: string): Promise<SearchResult[]> {
  // Safety: Prevent searching with empty or single-character strings
  if (!searchQuery || searchQuery.trim().length < 2) return [];

  const results: SearchResult[] = [];

  try {
    // 1. Search Products by name or SKU
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku")
      .ilike("name", `%${searchQuery}%`)
      .limit(3);

    (products || []).forEach((p: any) => {
      results.push({
        id: `prod_${p.id}`,
        type: "product",
        title: p.name,
        subtitle: `SKU: ${p.sku || "N/A"}`,
        url: `/catalog/products`,
      });
    });

    // 2. Search Customers (Stores) by store name
    const { data: customers } = await supabase
      .from("customers")
      .select("id, store_name, contact_person")
      .ilike("store_name", `%${searchQuery}%`)
      .limit(3);

    (customers || []).forEach((c: any) => {
      results.push({
        id: `cust_${c.id}`,
        type: "customer",
        title: c.store_name,
        subtitle: `Contact: ${c.contact_person || "N/A"}`,
        url: `/customers`,
      });
    });

    // 3. Search System Users by full name
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .ilike("full_name", `%${searchQuery}%`)
      .limit(3);

    (users || []).forEach((u: any) => {
      results.push({
        id: `user_${u.id}`,
        type: "user",
        title: u.full_name,
        subtitle: u.email,
        url: `/users`,
      });
    });

    return results;
  } catch (error) {
    console.error("Error in global search:", error);
    return [];
  }
}
