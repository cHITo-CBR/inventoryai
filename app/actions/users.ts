"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Interface representing a system user.
 */
export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  role_name?: string;
}

/**
 * Fetches all users from the system with optional search and role filtering.
 * Joins with the 'roles' table to provide human-readable role names.
 */
export async function getUsers(search?: string, roleFilter?: string): Promise<UserRow[]> {
  try {
    let query = supabase
      .from("users")
      .select("id, full_name, email, phone_number, status, is_active, created_at, roles(name)")
      .order("created_at", { ascending: false });

    // Filter by specific role (e.g., 'salesman', 'admin')
    if (roleFilter && roleFilter !== "all") {
      const { data: role } = await supabase
        .from("roles")
        .select("id")
        .eq("name", roleFilter)
        .maybeSingle();
      if (role) {
        query = query.eq("role_id", role.id);
      }
    }

    // Filter by name or email query
    if (search && search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((user: any) => ({
      ...user,
      role_name: user.roles?.name || null,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/**
 * Retrieves all available user roles for selection in forms.
 */
export async function getRoles(): Promise<{ id: number; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
}

/**
 * Manually creates a new system user with encrypted credentials.
 * Only accessible by administrators.
 */
export async function createUser(formData: FormData) {
  // Security: Verify that the requester is an authorized Admin
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const roleId = formData.get("roleId") as string;

  if (!fullName || !email || !password || !roleId) {
    return { error: "Missing required fields." };
  }

  try {
    // Hash password before saving to the database for security compliance
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateUUID();

    const { error } = await supabase.from("users").insert({
      id: userId,
      full_name: fullName,
      email,
      phone_number: phone || null,
      password_hash: passwordHash,
      role_id: parseInt(roleId),
      status: "approved", // Admin-created users are pre-approved
      is_active: true,
    });

    if (error) throw error;
    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create user." };
  }
}
