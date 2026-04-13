import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * SESSION MANAGEMENT
 * This file handles user authentication sessions using JSON Web Tokens (JWT).
 * It manages encryption, decryption, and cookie-based persistence.
 */

// Secret key for signing the JWT (from environment variables)
const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

/**
 * Encrypts a payload into a JWT string.
 * @param payload - The data to store in the session (e.g., user info)
 * @returns A signed JWT string valid for 1 day
 */
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(key);
}

/**
 * Decrypts a JWT string and returns the payload.
 * @param input - The signed JWT string from the cookie
 * @returns The original payload if signature is valid
 */
export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

/**
 * Creates a new session by encrypting user data and saving it in a cookie.
 * @param user - The user object containing ID, email, and role
 */
export async function createSession(user: any) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const session = await encrypt({ user, expires });

  // Use await for next/headers operations in Next.js 15+
  const cookieStore = await cookies();
  cookieStore.set("session", session, { 
    expires, 
    httpOnly: true, // Prevents JavaScript access to the cookie for security
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    path: "/" // Cookie accessible on all pages
  });
}

/**
 * Retrieves the current session from the cookies.
 * @returns The decrypted session object or null if no session exists or is invalid
 */
export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  try {
    return await decrypt(session);
  } catch (err) {
    return null; // Invalid token
  }
}

/**
 * Clears the session by expiring the cookie.
 * Used during logout.
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", { expires: new Date(0) });
}

