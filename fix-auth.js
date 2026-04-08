const fs = require('fs');
const content = `"use server";

import pool from "@/lib/db";
import { generateUUID } from "@/lib/db-helpers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs"; 
import { createSession, getSession, clearSession } from "@/lib/session";
import { RowDataPacket } from "mysql2/promise";

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

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?", [email]
    );

    if (existing && existing.length > 0) {
      return { error: "User already exists with this email." };
    }

    const userId = generateUUID();
    const isBuyer = roleName === "buyer";
    
    // Auto-approve the first admin or buyers
    const isAutoApprove = isBuyer || email === "admin@flowstock.com";
    
    const passwordHash = await bcrypt.hash(password, 10); 
    
    await pool.query(
      \`INSERT INTO users (id, full_name, email, phone_number, password_hash, role_id, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        userId, 
        fullName, 
        email, 
        phone || null, 
        passwordHash, 
        roleId, 
        isAutoApprove ? "approved" : "pending", 
        isAutoApprove ? 1 : 0
      ]
    );

    if (isBuyer) {
      const customerId = generateUUID();
      await pool.query(
        \`INSERT INTO customers (id, store_name, contact_person, email, phone_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?)\`,
        [customerId, fullName, fullName, email, phone || null, 1]
      );
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
    const [users] = await pool.query<RowDataPacket[]>(
      \`SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?\`, 
      [email]
    );

    const user = users[0];

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
      return { error: \`Account rejected. Reason: \${user.rejection_reason || 'Unknown'}\` };
    }
    if (!user.is_active) {
      return { error: "Account is inactive." };
    }

    // Determine role string representation
    const roleStr = user.role_name ? user.role_name.toLowerCase() : "buyer";

    await createSession({
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      role: roleStr
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
`;
fs.writeFileSync('app/actions/auth.ts', content);
