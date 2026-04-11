"use server";
import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSession, getSession, clearSession } from "@/lib/session";

export async function registerUser(prevState: any, formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const roleName = formData.get("role") as string;

  if (!fullName || !email || !password || !roleName) {
    return { error: "Missing required fields." };
  }

  try {
    const roleMap: Record<string, number> = {
      admin: 1, supervisor: 2, salesman: 3, buyer: 4
    };
    const roleId = roleMap[roleName] || 4;

    // Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return { error: "User already exists with this email." };
    }

    const userId = generateUUID();
    const isBuyer = roleName === "buyer";
    const isAutoApprove = isBuyer || email === "admin@flowstock.com";
    const passwordHash = await bcrypt.hash(password, 10);

    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      full_name: fullName,
      email,
      phone_number: phone || null,
      password_hash: passwordHash,
      role_id: roleId,
      status: isAutoApprove ? "approved" : "pending",
      is_active: isAutoApprove,
    });

    if (insertError) throw insertError;

    if (isBuyer) {
      await supabase.from("customers").insert({
        id: generateUUID(),
        store_name: fullName,
        contact_person: fullName,
        email,
        phone_number: phone || null,
        is_active: true,
      });
    }

    return { success: true, autoapproved: isAutoApprove };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: "Registration failed." };
  }
}

export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password required." };
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(name)")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return { error: "Invalid credentials." };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return { error: "Invalid credentials." };
    }

    if (user.status === "pending") {
      return { error: "Waiting for admin approval. Your account is pending." };
    }
    if (user.status === "rejected") {
      return { error: `Account rejected. Reason: ${user.rejection_reason || "Unknown"}` };
    }
    if (!user.is_active) {
      return { error: "Account is inactive." };
    }

    const roleStr = user.roles?.name ? user.roles.name.toLowerCase() : "buyer";

    await createSession({
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      role: roleStr,
    });

    return { success: true, role: roleStr };
  } catch (error: any) {
    console.error("Login error: ", error);
    return { error: "Login failed." };
  }
}

export async function logoutUser() {
  await clearSession();
  redirect("/login");
}

export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session || !session.user) return null;
    return { user: session.user };
  } catch (error) {
    return null;
  }
}
