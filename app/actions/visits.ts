"use server";
import supabase from "@/lib/db";

export interface StoreVisitRow {
  id: string;
  visit_date: string;
  notes: string | null;
  created_at: string;
  customers: { store_name: string } | null;
  users: { full_name: string } | null;
  store_visit_skus: { id: string }[];
}

export interface VisitReportDetail {
  id: string;
  visit_date: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  customers: { store_name: string } | null;
  users: { full_name: string } | null;
  store_visit_skus: {
    id: string;
    notes: string | null;
    product_variants: { name: string; sku: string | null } | null;
  }[];
}

export async function getStoreVisits(): Promise<StoreVisitRow[]> {
  try {
    const { data: visits, error } = await supabase
      .from("store_visits")
      .select("id, visit_date, notes, created_at, customers(store_name), users:salesman_id(full_name)")
      .order("visit_date", { ascending: false });

    if (error) throw error;

    const visitIds = (visits || []).map((v: any) => v.id);
    let skusMap = new Map<string, { id: string }[]>();

    if (visitIds.length > 0) {
      const { data: skus } = await supabase
        .from("store_visit_skus")
        .select("id, visit_id")
        .in("visit_id", visitIds);

      for (const sku of (skus || [])) {
        if (!skusMap.has(sku.visit_id)) skusMap.set(sku.visit_id, []);
        skusMap.get(sku.visit_id)!.push({ id: sku.id });
      }
    }

    return (visits || []).map((v: any) => ({
      id: v.id,
      visit_date: v.visit_date,
      notes: v.notes,
      created_at: v.created_at,
      customers: v.customers || null,
      users: v.users || null,
      store_visit_skus: skusMap.get(v.id) || [],
    }));
  } catch {
    return [];
  }
}

export async function getVisitReport(id: string): Promise<VisitReportDetail | null> {
  try {
    const { data: visit, error } = await supabase
      .from("store_visits")
      .select("id, visit_date, notes, latitude, longitude, customers(store_name), users:salesman_id(full_name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!visit) return null;

    const { data: skus } = await supabase
      .from("store_visit_skus")
      .select("id, notes, product_variants:variant_id(name, sku)")
      .eq("visit_id", id);

    return {
      id: visit.id,
      visit_date: visit.visit_date,
      notes: visit.notes,
      latitude: visit.latitude,
      longitude: visit.longitude,
      customers: visit.customers || null,
      users: visit.users || null,
      store_visit_skus: (skus || []).map((s: any) => ({
        id: s.id,
        notes: s.notes,
        product_variants: s.product_variants || null,
      })),
    };
  } catch {
    return null;
  }
}
