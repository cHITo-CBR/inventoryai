"use server";
import supabase from "@/lib/db";

export interface SalesTrendPoint { date: string; total: number; }
export interface CategorySalesPoint { category: string; total: number; }

export async function getSalesTrends(): Promise<SalesTrendPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("sales_transactions")
      .select("total_amount, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const grouped: Record<string, number> = {};
    data.forEach((t: any) => {
      const date = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      grouped[date] = (grouped[date] || 0) + (Number(t.total_amount) || 0);
    });

    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  } catch (error) {
    console.error("Error fetching sales trends:", error);
    return [];
  }
}

export async function getTopCategories(): Promise<CategorySalesPoint[]> {
  try {
    const { data, error } = await supabase
      .from("sales_transaction_items")
      .select("subtotal, product_variants(products(product_categories(name)))");

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const grouped: Record<string, number> = {};
    data.forEach((item: any) => {
      const catName = item.product_variants?.products?.product_categories?.name ?? "Uncategorized";
      grouped[catName] = (grouped[catName] || 0) + (Number(item.subtotal) || 0);
    });

    return Object.entries(grouped)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching top categories:", error);
    return [];
  }
}
