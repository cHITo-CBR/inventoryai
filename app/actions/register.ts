"use server";

import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";

/**
 * Handles the registration of a new physical store (Customer).
 * 1. Validates all required geographic and contact fields.
 * 2. Creates a unique ID for the new customer.
 * 3. Registers the store in the 'customers' table.
 * Note: This creates a customer directory entry, NOT a login-capable system user.
 */
export async function submitStoreRegistration(prevState: any, formData: FormData) {
  try {
    const store_name = formData.get("store_name") as string;
    const contact_person = formData.get("contact_person") as string;
    const phone_number = formData.get("phone_number") as string;
    const email = formData.get("email") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const region = formData.get("region") as string;

    // Enforce mandatory data collection for logistics and billing
    if (!store_name || !contact_person || !phone_number || !email || !address || !city || !region) {
      return { error: "All fields are required." };
    }

    // Default behavior per business requirements:
    // - assigned_salesman_id = NULL (Admin must assign a salesman later)
    // - is_active = true (Instantly available for assignment)
    
    const customerId = generateUUID();
    
    // Insert record into Supabase 'customers' table
    const { error } = await supabase.from("customers").insert({
      id: customerId,
      store_name,
      contact_person,
      email,
      phone_number,
      address,
      city,
      region,
      assigned_salesman_id: null,
      is_active: true,
      // created_at is handled automatically by the DB schema default
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return { error: "Failed to register store. It may already exist or database schema is missing address fields." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Store registration exception:", error);
    return { error: "An unexpected error occurred during registration." };
  }
}
