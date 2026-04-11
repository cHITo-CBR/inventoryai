"use server";
import supabase from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        status: "approved",
        is_active: true,
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to approve user." };
  }
}

export async function rejectUser(userId: string, reason: string) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        status: "rejected",
        is_active: false,
        rejection_reason: reason,
      })
      .eq("id", userId);

    if (error) throw error;
    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to reject user." };
  }
}
