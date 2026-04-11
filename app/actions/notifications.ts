"use server";
import supabase from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface NotificationRow {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

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

export async function markNotificationRead(id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/notifications");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to mark notification as read." };
  }
}

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
