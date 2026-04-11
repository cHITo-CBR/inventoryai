"use server";
import supabase from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface SettingRow {
  id: number;
  key: string;
  value: string | null;
  updated_at: string;
}

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

export async function updateSetting(key: string, value: string) {
  try {
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("system_settings")
        .insert({ key, value });
      if (error) throw error;
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update setting." };
  }
}
