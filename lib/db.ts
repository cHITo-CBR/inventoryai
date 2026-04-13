import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * DATABASE INITIALIZATION
 * This file initializes the Supabase client used throughout the application's backend.
 * It uses a singleton pattern to prevent multiple connections during development hot-reloads.
 */

// Environment variables for connection - these should be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Define a global type to store the supabase instance across development hot-reloads
const globalForSupabase = global as unknown as { supabase: SupabaseClient<any, "public", any> };

/**
 * Initialize or reuse the existing Supabase client.
 * If globalForSupabase.supabase already exists (from a previous reload), use it.
 * Otherwise, create a new client using the URL and Key.
 */
const supabase: SupabaseClient<any, "public", any> =
  globalForSupabase.supabase ||
  createClient(supabaseUrl, supabaseKey);

// In development mode, save the client to the global object
if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;

// Export as the default database client
export default supabase;

