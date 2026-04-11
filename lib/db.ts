import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the publishable key.
// This is used in server actions and API routes.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// In development, Next.js clears the module cache often.
// We use a global variable to keep the client across hot reloads.
const globalForSupabase = global as unknown as { supabase: SupabaseClient<any, "public", any> };

const supabase: SupabaseClient<any, "public", any> =
  globalForSupabase.supabase ||
  createClient(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;

export default supabase;
