"use server";
import supabase from "@/lib/db";

export type SearchResult = {
  id: string;
  type: "product" | "customer" | "user" | "transaction";
  title: string;
  subtitle: string;
  url: string;
};

export async function globalSearch(searchQuery: string): Promise<SearchResult[]> {
  if (!searchQuery || searchQuery.trim().length < 2) return [];

  const results: SearchResult[] = [];

  try {
    // Search Products
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

    // Search Customers
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

    // Search Users
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
