import supabase from "@/lib/db";

// 🔹 Low stock
export async function getLowStock() {
  const { data, error } = await supabase
    .from("products")
    .select("name, total_cases")
    .lt("total_cases", 10)
    .eq("is_archived", false);
  
  if (error) throw error;
  return data;
}

// 🔹 Top salesman
export async function getTopSalesman() {
  const { data, error } = await supabase
    .from("sales_transactions")
    .select(`
      salesman_id,
      total_amount,
      users:salesman_id (full_name)
    `)
    .eq("status", "completed");

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Aggregate by salesman
  const aggregated = data.reduce((acc: any, curr: any) => {
    const name = curr.users?.full_name || "Unknown";
    if (!acc[name]) {
      acc[name] = 0;
    }
    acc[name] += Number(curr.total_amount);
    return acc;
  }, {});

  const topSalesman = Object.entries(aggregated).reduce((a: any, b: any) => a[1] > b[1] ? a : b);
  return { name: topSalesman[0], total: topSalesman[1] };
}

// 🔹 Top Customer
export async function getTopCustomer() {
  const { data, error } = await supabase
    .from("sales_transactions")
    .select(`
      customer_id,
      total_amount,
      customers:customer_id (store_name)
    `)
    .eq("status", "completed");

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const aggregated = data.reduce((acc: any, curr: any) => {
    const name = curr.customers?.store_name || "Unknown Store";
    acc[name] = (acc[name] || 0) + Number(curr.total_amount);
    return acc;
  }, {});

  const top = Object.entries(aggregated).reduce((a: any, b: any) => a[1] > b[1] ? a : b);
  return { name: top[0], total: top[1] };
}

// 🔹 Sales Summary
export async function getSalesSummary() {
  const { data, error } = await supabase
    .from("sales_transactions")
    .select("total_amount")
    .eq("status", "completed");

  if (error) throw error;
  const total = data.reduce((sum, item) => sum + Number(item.total_amount), 0);
  return { total, count: data.length };
}
