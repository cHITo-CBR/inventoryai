"use server";
import supabase from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Interface representing a system configuration setting.
 */
export interface SettingRow {
  id: number;
  key: string;
  value: string | null;
  updated_at: string;
}

/**
 * Retrieves all global system settings.
 */
export async function getSettings(): Promise<SettingRow[]> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("key");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching settings:", error);
    return [];
  }
}

/**
 * Updates an existing setting or inserts a new key-value pair if it doesn't exist.
 */
export async function updateSetting(key: string, value: string) {
  try {
    // 1. Check if the setting key already exists
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      // 2. Perform Update
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    } else {
      // 3. Perform Insert
      const { error } = await supabase
        .from("system_settings")
        .insert({ key, value });
      if (error) throw error;
    }

    // Force a UI refresh to reflect the new configuration
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update setting." };
  }
}
