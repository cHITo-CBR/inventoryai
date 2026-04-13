"use server";

/**
 * AUTHENTICATION ACTIONS
 * This file contains server-side actions for user registration, login, and logout.
 * These functions run on the server and are called directly from client forms.
 */

import supabase from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSession, getSession, clearSession } from "@/lib/session";
import { notifyRole } from "@/app/actions/notifications";

/**
 * Handles new user registration.
 * 1. Validates input
 * 2. Checks for existing users
 * 3. Hashes passwords
 * 4. Inserts into 'users' table (and 'customers' table for buyers)
 */
export async function registerUser(prevState: any, formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const roleName = formData.get("role") as string;

  // Basic validation
  if (!fullName || !email || !password || !roleName) {
    return { error: "Missing required fields." };
  }

  try {
    // Map role names to database IDs
    const roleMap: Record<string, number> = {
      admin: 1, supervisor: 2, salesman: 3, buyer: 4
    };
    const roleId = roleMap[roleName] || 4;

    // Check if email already exists in the system
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return { error: "User already exists with this email." };
    }

    const userId = generateUUID();
    // Buyers and specific admin emails are auto-approved
    const isBuyer = roleName === "buyer";
    const isAutoApprove = isBuyer || email === "admin@flowstock.com";
    
    // Hash the password for secure storage
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user record
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

    // If user is a buyer, also create a record in the customers table
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

    // Notify the admin of a new registration
    await notifyRole(
      "admin", 
      "New User Registration", 
      `A new user (${fullName}) has registered as a ${roleName} and requires review.`,
      "info"
    );

    return { success: true, autoapproved: isAutoApprove };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

/**
 * Handles user login.
 * 1. Authenticates credentials
 * 2. Checks account status (pending/rejected/active)
 * 3. Creates a secure identity session
 */
export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password required." };
  }

  try {
    // Fetch user and their role from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(name)")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return { error: "Invalid credentials." };
    }

    // Compare provided password with hashed password in DB
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return { error: "Invalid credentials." };
    }

    // CHECK ACCOUNT STATUS
    if (user.status === "pending") {
      return { error: "Waiting for admin approval. Your account is pending." };
    }
    if (user.status === "rejected") {
      return { error: `Account rejected. Reason: ${user.rejection_reason || "Unknown"}` };
    }
    if (!user.is_active) {
      return { error: "Account is inactive." };
    }

    // Determine role and initialize session
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

/**
 * Logs out the current user by clearing the session cookie.
 */
export async function logoutUser() {
  await clearSession();
  redirect("/login");
}

/**
 * Utility to get the current authenticated user's session data.
 */
export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session || !session.user) return null;
    return { user: session.user };
  } catch (error) {
    return null;
  }
}

