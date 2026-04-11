"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

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

export async function getUsers(search?: string, roleFilter?: string): Promise<UserRow[]> {
  try {
    let query = supabase
      .from("users")
      .select("id, full_name, email, phone_number, status, is_active, created_at, roles(name)")
      .order("created_at", { ascending: false });

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

export async function createUser(formData: FormData) {
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
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateUUID();

    const { error } = await supabase.from("users").insert({
      id: userId,
      full_name: fullName,
      email,
      phone_number: phone || null,
      password_hash: passwordHash,
      role_id: parseInt(roleId),
      status: "approved",
      is_active: true,
    });

    if (error) throw error;
    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create user." };
  }
}
