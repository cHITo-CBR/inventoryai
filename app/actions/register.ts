"use server";

import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";

export async function submitStoreRegistration(prevState: any, formData: FormData) {
  try {
    const store_name = formData.get("store_name") as string;
    const contact_person = formData.get("contact_person") as string;
    const phone_number = formData.get("phone_number") as string;
    const email = formData.get("email") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const region = formData.get("region") as string;

    if (!store_name || !contact_person || !phone_number || !email || !address || !city || !region) {
      return { error: "All fields are required." };
    }

    // Default behavior per requirements:
    // assigned_salesman_id = NULL
    // is_active = 1 (true)
    // created_at = NOW() (supabase handles this automatically if not passed, but we can pass new Date() if we want or just leave default)
    
    // We only create a customer, NOT a system user. 
    const customerId = generateUUID();
    
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
      // created_at will default to now() usually in Supabase, but we can explicitly set it if needed.
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
