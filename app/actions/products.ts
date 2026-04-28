"use server";

/**
 * PRODUCT MANAGEMENT ACTIONS
 * This file handles the core inventory catalog.
 * Operations include:
 * - Fetching active and archived products
 * - Creating products with image uploads (Cloudinary)
 * - Managing product variants (different sizes/packaging)
 * - Archiving and restoring products
 */

import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { revalidatePath } from "next/cache";
import { uploadImageFromBase64, deleteFromCloudinary } from "./cloudinary";
import { notifyRole } from "@/app/actions/notifications";

/**
 * Represents the main Product object structure.
 * Includes optional joined fields for related brands and categories.
 */
export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  total_cases: number;
  items_per_case: number;
  packaging_price: number | null;
  is_active: boolean;
  created_at: string;
  category_id: number | null;
  brand_id: number | null;
  packaging_id: number | null;
  category_name?: string | null;
  brand_name?: string | null;
  packaging_type_name?: string | null;
  total_packaging?: string | null;
  net_weight?: string | null;
  // Included from joined tables for compatibility with older UI components
  product_categories?: { name: string } | null;
  brands?: { name: string } | null;
  packaging_types?: { name: string; description: string | null } | null;
}

/**
 * Represents a variation of a product (e.g., different pack sizes).
 */
export interface ProductVariantRow {
  id?: string;
  product_id?: string;
  name: string;
  sku: string | null;
  unit_price: number;
  packaging_id?: number | null;
  unit_id?: number | null;
  is_active: boolean;
}

/**
 * Fetches all non-archived products.
 * Includes related details like brand and category using Supabase joins.
 */
export async function getProducts(search?: string): Promise<ProductRow[]> {
  try {
    let query = supabase
      .from("products")
      .select(`
        *,
        product_categories(name),
        brands(name),
        packaging_types(name, description)
      `)
      .eq("is_archived", false) // Security: only fetch items NOT in the trash
      .order("created_at", { ascending: false });

    // Apply search filter if provided by the user
    if (search && search.trim()) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    // Format the result to flatten joined table values for easier UI mapping
    return (products || []).map((p: any) => ({
      ...p,
      category_name: p.product_categories?.name || null,
      brand_name: p.brands?.name || null,
      packaging_type_name: p.packaging_types
        ? `${p.packaging_types.name}${p.packaging_types.description ? ` - ${p.packaging_types.description}` : ""}`
        : null,
      packaging_price: p.packaging_price ? Number(p.packaging_price) : null,
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/**
 * Creates a new product and its initial variants.
 * Handles base64 image uploads to Cloudinary storage.
 */
export async function createProduct(formData: FormData) {
  // Extract all relevant data from the standard HTML form
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const brandId = formData.get("brandId") as string;
  const packagingId = formData.get("packagingId") as string;
  const totalCases = formData.get("totalCases") as string;
  const packagingPrice = formData.get("packagingPrice") as string;
  const totalPackaging = formData.get("totalPackaging") as string;
  const netWeight = formData.get("netWeight") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const imageFile = formData.get("imageFile") as string; // Base64 encoded string from client
  const variantsJSON = formData.get("variants") as string;

  if (!name) return { error: "Product name is required." };

  try {
    const productId = generateUUID();

    // 1. UPLOAD IMAGE TO CLOUDINARY if provided
    let finalImageUrl = imageUrl || null;
    if (imageFile && imageFile.startsWith("data:image")) {
      const uploadResult = await uploadImageFromBase64(imageFile, "products");
      if (uploadResult.success && uploadResult.url) {
        finalImageUrl = uploadResult.url;
      }
    }

    // 2. SAVE CORE PRODUCT RECORD
    const { error: insertError } = await supabase.from("products").insert({
      id: productId,
      name,
      description: description || null,
      image_url: finalImageUrl,
      packaging_id: packagingId ? parseInt(packagingId) : null,
      total_packaging: totalPackaging || null,
      net_weight: netWeight || null,
      total_cases: totalCases ? parseInt(totalCases) : 0,
      packaging_price: packagingPrice ? parseFloat(packagingPrice) : 0.00,
      category_id: categoryId ? parseInt(categoryId) : null,
      brand_id: brandId ? parseInt(brandId) : null,
      is_active: true,
      is_archived: false,
    });

    if (insertError) throw insertError;

    // 3. HANDLE VARIANTS SYNCING
    let variants: ProductVariantRow[] = [];
    try {
      if (variantsJSON) variants = JSON.parse(variantsJSON);
    } catch (e) {
      console.error("Failed to parse variants JSON", e);
    }

    if (variants.length > 0) {
      // Create specific variants for different units/sizes
      const variantRows = variants.map((v) => ({
        id: generateUUID(),
        product_id: productId,
        name: v.name,
        sku: v.sku || `SKU-${name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        unit_price: Number(v.unit_price) || 0,
        packaging_id: v.packaging_id || null,
        unit_id: v.unit_id || null,
        is_active: true,
      }));
      await supabase.from("product_variants").insert(variantRows);
    } else {
      // Fallback: Create a default 'Standard' variant if no specifics were given
      await supabase.from("product_variants").insert({
        id: generateUUID(),
        product_id: productId,
        name: "Standard",
        sku: `SKU-${name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        unit_price: 0,
        is_active: true,
      });
    }

    // Refresh pages that display product data
    revalidatePath("/catalog/products");
    revalidatePath("/admin/catalog/products");
    revalidatePath("/notifications");

    // Broadcoast system-wide notifications about the new inventory addition
    await notifyRole("supervisor", "New Product Added", `The product "${name}" has been added to the catalog.`);
    await notifyRole("salesman", "New Product Added", `The product "${name}" is now available for ordering.`);

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create product." };
  }
}

/**
 * Retrieves products that have been moved to the archives (soft-deleted).
 */
export async function getArchivedProducts(): Promise<ProductRow[]> {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        *,
        product_categories(name),
        brands(name),
        packaging_types(name, description)
      `)
      .eq("is_archived", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (products || []).map((p: any) => ({
      ...p,
      category_name: p.product_categories?.name || null,
      brand_name: p.brands?.name || null,
      packaging_type_name: p.packaging_types
        ? `${p.packaging_types.name}${p.packaging_types.description ? ` - ${p.packaging_types.description}` : ""}`
        : null,
      packaging_price: p.packaging_price ? Number(p.packaging_price) : null,
    }));
  } catch (error) {
    console.error("Error fetching archived products:", error);
    return [];
  }
}

/**
 * Soft-deletes a product by moving it to the archive.
 */
export async function archiveProduct(id: string) {
  try {
    const { error } = await supabase
      .from("products")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/catalog/products");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to archive product." };
  }
}

/**
 * Restores a previously archived product back to the active catalog.
 */
export async function restoreProduct(id: string) {
  try {
    const { error } = await supabase
      .from("products")
      .update({ is_archived: false })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/archives");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to restore product." };
  }
}

/**
 * Updates an existing product's details and synchronizes its variants.
 * Handles adding, updating, and removing variants based on the incoming form data.
 */
export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const brandId = formData.get("brandId") as string;
  const packagingId = formData.get("packagingId") as string;
  const totalCases = formData.get("totalCases") as string;
  const packagingPrice = formData.get("packagingPrice") as string;
  const totalPackaging = formData.get("totalPackaging") as string;
  const netWeight = formData.get("netWeight") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const variantsJSON = formData.get("variants") as string;

  if (!name) return { error: "Product name is required." };

  try {
    // 1. UPDATE THE MASTER PRODUCT RECORD
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name,
        description: description || null,
        image_url: imageUrl || null,
        packaging_id: packagingId ? parseInt(packagingId) : null,
        total_packaging: totalPackaging || null,
        net_weight: netWeight || null,
        total_cases: totalCases ? parseInt(totalCases) : 0,
        packaging_price: packagingPrice ? parseFloat(packagingPrice) : 0.00,
        category_id: categoryId ? parseInt(categoryId) : null,
        brand_id: brandId ? parseInt(brandId) : null,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // 2. SYNC VARIANTS (Add new, Update existing, Delete removed)
    if (variantsJSON) {
      try {
        const variants: ProductVariantRow[] = JSON.parse(variantsJSON);

        // Fetch current variants to determine which ones need to be deleted
        const { data: existingVariants } = await supabase
          .from("product_variants")
          .select("id")
          .eq("product_id", id);

        const existingIds = (existingVariants || []).map((v: any) => v.id);
        const incomingIds = variants.map((v) => v.id).filter(Boolean) as string[];

        // Perform cleanup: Delete variants that were removed from the edit form
        const toDelete = existingIds.filter((eid: string) => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await supabase.from("product_variants").delete().in("id", toDelete);
        }

        // Add new variants or update existing ones
        for (const v of variants) {
          if (v.id) {
            // Update an existing variant entry
            await supabase
              .from("product_variants")
              .update({
                product_id: id,
                name: v.name,
                sku: v.sku,
                unit_price: Number(v.unit_price) || 0,
                packaging_id: v.packaging_id || null,
                unit_id: v.unit_id || null,
                is_active: true,
              })
              .eq("id", v.id);
          } else {
            // Register a brand new variant for this product
            await supabase.from("product_variants").insert({
              id: generateUUID(),
              product_id: id,
              name: v.name,
              sku: v.sku,
              unit_price: Number(v.unit_price) || 0,
              packaging_id: v.packaging_id || null,
              unit_id: v.unit_id || null,
              is_active: true,
            });
          }
        }
      } catch (e) {
        console.error("Failed to sync variants", e);
      }
    }

    revalidatePath("/catalog/products");
    revalidatePath("/admin/catalog/products");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update product." };
  }
}

/**
 * Fetches all active variants for a specific product.
 */
export async function getProductVariantsByProductId(productId: string): Promise<ProductVariantRow[]> {
  try {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("unit_price", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return [];
  }
}

/**
 * Fetches all product variants across the entire catalog.
 * Useful for building order forms where you select from a combined master list.
 */
export async function getProductVariants(): Promise<{ id: string; name: string; unit_price: number; sku: string | null; product_name?: string; total_cases?: number; packaging_price?: number }[]> {
  try {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, name, unit_price, sku, products(name, total_cases, packaging_price)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    
    // Map the relational response to flatten the product fields for the UI
    return (data || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      unit_price: v.products?.packaging_price || v.unit_price, // Use case price if available
      sku: v.sku,
      product_name: v.products?.name || v.name,
      total_cases: v.products?.total_cases || 0
    }));
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return [];
  }
}

