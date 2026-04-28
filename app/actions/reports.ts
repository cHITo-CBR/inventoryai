"use server";
import supabase from "@/lib/db";

/**
 * Interface representing a data point in the sales trend chart.
 */
export interface SalesTrendPoint { date: string; total: number; }

/**
 * Interface representing sales volume grouped by product category.
 */
export interface CategorySalesPoint { category: string; total: number; }

/**
 * Aggregates sales volume over the last 30 days for trend visualization.
 * 1. Fetches all successful transactions in the time window.
 * 2. Groups them by day.
 * 3. Formats for standard line/bar chart components.
 */
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

    // Local aggregation logic to avoid complex DB grouping queries
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

/**
 * Retrieves the top 5 product categories based on sales revenue.
 * Performs deep joins through transaction items -> variants -> products -> categories.
 */
export async function getTopCategories(): Promise<CategorySalesPoint[]> {
  try {
    const { data, error } = await supabase
      .from("sales_transaction_items")
      .select("subtotal, product_variants(products(product_categories(name)))");

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const grouped: Record<string, number> = {};
    data.forEach((item: any) => {
      // Navigate the joined relationship tree safely
      const catName = item.product_variants?.products?.product_categories?.name ?? "Uncategorized";
      grouped[catName] = (grouped[catName] || 0) + (Number(item.subtotal) || 0);
    });

    // Convert grouped object to sorted array and limit to top 5
    return Object.entries(grouped)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching top categories:", error);
    return [];
  }
}
