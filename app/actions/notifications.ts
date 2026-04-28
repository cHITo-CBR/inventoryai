"use server";
import supabase from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Interface representing a system notification.
 */
export interface NotificationRow {
  id: string;
  title: string;
  message: string | null;
  type: string; // e.g., 'info', 'warning', 'success', 'error'
  is_read: boolean;
  created_at: string;
}

/**
 * Fetches notifications for the currently logged-in user.
 */
export async function getNotifications(): Promise<NotificationRow[]> {
  try {
    const session = await getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

/**
 * Counts the number of unread notifications for the current user.
 * Used for badge counters in the UI.
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) return 0;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    return count ?? 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
}

/**
 * Marks a specific notification as seen.
 */
export async function markNotificationRead(id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
    // Refresh the notifications list globally
    revalidatePath("/notifications");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to mark notification as read." };
  }
}

/**
 * Marks all notifications for the current user as read in one batch.
 */
export async function markAllRead() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (error) throw error;
    revalidatePath("/notifications");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to mark all as read." };
  }
}

/**
 * Low-level utility to create a notification for a specific user ID.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "info"
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });
    if (error) console.error("Error creating notification:", error);
  } catch (error) {
    console.error("Error creating notification exception:", error);
  }
}

/**
 * High-level utility to broadcast a notification to every user holding a specific role.
 * Example: Notifying all 'admins' of a new registration.
 * 1. Finds the internal ID for the role name.
 * 2. Fetches all active users associated with that role.
 * 3. Batch inserts notifications for all discovered users.
 */
export async function notifyRole(
  roleName: "admin" | "supervisor" | "salesman",
  title: string,
  message: string,
  type: string = "info"
) {
  try {
    // 1. Fetch the numerical role ID from the names mapping
    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (!role) return;

    // 2. Fetch all active users with this role to build the distribution list
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .eq("role_id", role.id)
      .eq("is_active", true);

    if (!users || users.length === 0) return;

    // 3. Batch insert notifications for those users efficiently
    const payload = users.map((u) => ({
      user_id: u.id,
      title,
      message,
      type,
      is_read: false,
    }));

    await supabase.from("notifications").insert(payload);
  } catch (error) {
    console.error(`Error notifying role ${roleName}:`, error);
  }
}

