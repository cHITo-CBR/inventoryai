"use server";
import supabase from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Approves a pending user registration.
 * 1. Verifies that the requester is an admin.
 * 2. Updates user status to 'approved' and sets active flag to true.
 * 3. Records who approved the user and at what time.
 * 4. Refreshes the admin approval page to show the updated list.
 */
export async function approveUser(userId: string) {
  const session = await getSession();
  // Authorization check: Only admins can approve users
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
    // Clear cache for the approvals page to show latest data
    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to approve user." };
  }
}

/**
 * Rejects a user registration.
 * 1. Verifies admin session.
 * 2. Updates status to 'rejected' and ensures account is inactive.
 * 3. Saves the rejection reason provided by the admin.
 */
export async function rejectUser(userId: string, reason: string) {
  const session = await getSession();
  // Authorization check: Only admins can reject users
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
    // Clear cache for the approvals page
    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to reject user." };
  }
}
