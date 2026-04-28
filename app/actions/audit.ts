"use server";
import supabase from "@/lib/db";

/**
 * Interface representing a single audit log entry.
 * Tracks system actions, entities involved, and user metadata.
 */
export interface AuditLogRow {
  id: string;
  action: string; // The type of activity (e.g., 'LOGIN', 'CREATE_PRODUCT')
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  metadata: any;
  created_at: string;
  user_name?: string | null; // Joined full name of the user who performed the action
}

/**
 * Fetches the most recent 50 audit logs from the database.
 * Includes a join with the 'users' table to display human-readable names.
 */
export async function getAuditLogs(): Promise<AuditLogRow[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, ip_address, metadata, created_at, users:user_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(50); // Pagination/Limit to avoid massive data transfer

    if (error) throw error;

    // Flatten the result to make it easier for UI components to use
    return (data || []).map((log: any) => ({
      ...log,
      user_name: log.users?.full_name || null,
    }));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}
