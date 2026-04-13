"use server";

/**
 * CATALOG CONFIGURATION ACTIONS
 * This file handles the organizational data for the inventory system:
 * 1. Categories (e.g., Canned Goods, Condiments)
 * 2. Brands (e.g., Century Tuna, 555)
 * 3. Units (e.g., Piece, Pack, Bundle)
 * 4. Packaging Types (e.g., Tin Can, Pouch)
 */

import supabase from "@/lib/db";
import { revalidatePath } from "next/cache";

// ── CATEGORIES MANAGEMENT ──────────────────────────────────────────────
/**
 * CRUD operations for product categories.
 * Allows organizing products into high-level groups.
 */
export interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_archived: boolean;
}

export async function getCategories(): Promise<CategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getArchivedCategories(): Promise<CategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .eq("is_archived", true)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching archived categories:", error);
    return [];
  }
}

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase.from("product_categories").insert({
      name,
      description: description || null,
    });
    if (error) throw error;
    revalidatePath("/catalog/categories");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create category." };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase
      .from("product_categories")
      .update({ name, description: description || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/categories");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update category." };
  }
}

export async function archiveCategory(id: number) {
  try {
    const { error } = await supabase
      .from("product_categories")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/categories");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive category." };
  }
}

export async function restoreCategory(id: number) {
  try {
    const { error } = await supabase
      .from("product_categories")
      .update({ is_archived: false })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/catalog/categories");
    revalidatePath("/catalog/categories");
    revalidatePath("/admin/archives");
    revalidatePath("/archives");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore category." };
  }
}

export async function deleteCategory(id: number) {
  try {
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/categories");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete category." };
  }
}

// ── BRANDS MANAGEMENT ──────────────────────────────────────────────────
/**
 * CRUD operations for brands.
 * Allows filtering products by their manufacturer/brand name.
 */
export interface BrandRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_archived: boolean;
}

export async function getBrands(): Promise<BrandRow[]> {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}

export async function getArchivedBrands(): Promise<BrandRow[]> {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_archived", true)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching archived brands:", error);
    return [];
  }
}

export async function createBrand(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase.from("brands").insert({
      name,
      description: description || null,
    });
    if (error) throw error;
    revalidatePath("/catalog/brands");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create brand." };
  }
}

export async function updateBrand(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase
      .from("brands")
      .update({ name, description: description || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/brands");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update brand." };
  }
}

export async function archiveBrand(id: number) {
  try {
    const { error } = await supabase
      .from("brands")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/brands");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive brand." };
  }
}

export async function restoreBrand(id: number) {
  try {
    const { error } = await supabase
      .from("brands")
      .update({ is_archived: false })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/catalog/brands");
    revalidatePath("/catalog/brands");
    revalidatePath("/admin/archives");
    revalidatePath("/archives");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore brand." };
  }
}

export async function deleteBrand(id: number) {
  try {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/brands");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete brand." };
  }
}

// ── UNITS MANAGEMENT ──────────────────────────────────────────────────
/**
 * CRUD operations for measurement units.
 */
export interface UnitRow {
  id: number;
  name: string;
  abbreviation: string | null;
  created_at: string;
  is_archived: boolean;
}

export async function getUnits(): Promise<UnitRow[]> {
  try {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching units:", error);
    return [];
  }
}

export async function getArchivedUnits(): Promise<UnitRow[]> {
  try {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("is_archived", true)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching archived units:", error);
    return [];
  }
}

export async function createUnit(formData: FormData) {
  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase.from("units").insert({
      name,
      abbreviation: abbreviation || null,
    });
    if (error) throw error;
    revalidatePath("/catalog/units");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create unit." };
  }
}

export async function updateUnit(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  if (!name) return { error: "Name is required." };

  try {
    const { error } = await supabase
      .from("units")
      .update({ name, abbreviation: abbreviation || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/units");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update unit." };
  }
}

export async function archiveUnit(id: number) {
  try {
    const { error } = await supabase
      .from("units")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/units");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive unit." };
  }
}

export async function restoreUnit(id: number) {
  try {
    const { error } = await supabase
      .from("units")
      .update({ is_archived: false })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/catalog/units");
    revalidatePath("/catalog/units");
    revalidatePath("/admin/archives");
    revalidatePath("/archives");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore unit." };
  }
}

export async function deleteUnit(id: number) {
  try {
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/units");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete unit." };
  }
}

// ── PACKAGING TYPES MANAGEMENT ────────────────────────────────────────
/**
 * CRUD operations for product packaging configurations.
 */
export interface PackagingRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_archived: boolean;
}

export async function getPackagingTypes(): Promise<PackagingRow[]> {
  try {
    const { data, error } = await supabase
      .from("packaging_types")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching packaging types:", error);
    return [];
  }
}

export async function getArchivedPackagingTypes(): Promise<PackagingRow[]> {
  try {
    const { data, error } = await supabase
      .from("packaging_types")
      .select("*")
      .eq("is_archived", true)
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching archived packaging types:", error);
    return [];
  }
}

export async function createPackagingType(formData: FormData) {
  const packaging = formData.get("packaging") as string;
  const itemsPerCase = formData.get("itemsPerCase") as string;
  if (!packaging) return { error: "Packaging is required." };

  let name = packaging;
  let description = null;
  // Parse 'Name - Description' format if present
  if (packaging.includes(" - ")) {
    const parts = packaging.split(" - ");
    name = parts[0].trim();
    description = parts[1].trim();
  }

  try {
    const { error } = await supabase.from("packaging_types").insert({
      name,
      description,
      items_per_case: itemsPerCase ? parseInt(itemsPerCase) : 1,
    });
    if (error) throw error;
    revalidatePath("/catalog/packaging");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create packaging type." };
  }
}

export async function updatePackagingType(id: number, formData: FormData) {
  const packaging = formData.get("packaging") as string;
  const itemsPerCase = formData.get("itemsPerCase") as string;
  if (!packaging) return { error: "Packaging is required." };

  let name = packaging;
  let description = null;
  if (packaging.includes(" - ")) {
    const parts = packaging.split(" - ");
    name = parts[0].trim();
    description = parts[1].trim();
  }

  try {
    const { error } = await supabase
      .from("packaging_types")
      .update({
        name,
        description,
        items_per_case: itemsPerCase ? parseInt(itemsPerCase) : 1,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/packaging");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update packaging type." };
  }
}

export async function archivePackagingType(id: number) {
  try {
    const { error } = await supabase
      .from("packaging_types")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/packaging");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive packaging type." };
  }
}

export async function restorePackagingType(id: number) {
  try {
    const { error } = await supabase
      .from("packaging_types")
      .update({ is_archived: false })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/catalog/packaging");
    revalidatePath("/catalog/packaging");
    revalidatePath("/admin/archives");
    revalidatePath("/archives");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore packaging type." };
  }
}

export async function deletePackagingType(id: number) {
  try {
    const { error } = await supabase.from("packaging_types").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/packaging");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete packaging type." };
  }
}

