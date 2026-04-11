import supabase from "./db";

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * No-op conversions: PostgreSQL uses native booleans, so no conversion needed.
 * Kept for backward compatibility with existing code that calls these.
 */
export function toBoolean(value: any): boolean {
  return value === true || value === 1 || value === "true";
}

export function fromBoolean(value: boolean): boolean {
  return value;
}

/**
 * The Supabase client instance for direct use in server actions.
 * Replaces the old query/queryOne/insert/update/remove pattern.
 */
export { supabase };

// ──────────────────────────────────────────────────────────────
// Legacy-compatible helper functions
// These wrap Supabase queries to maintain a similar API to the old MySQL helpers.
// However, most refactored actions will use supabase directly.
// ──────────────────────────────────────────────────────────────

/**
 * Execute a raw SQL query via Supabase's rpc or the REST API.
 * Note: For most operations, use supabase.from() instead.
 */
export async function rawQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // This is a fallback — direct SQL not recommended with Supabase JS.
  // Use supabase.from('table').select() etc. instead.
  throw new Error("rawQuery is deprecated. Use supabase.from() methods instead.");
}

/**
 * Build case-insensitive LIKE search (for Supabase ilike)
 */
export function buildIlikeSearch(column: string, searchTerm: string): string {
  // Escape special characters in the search term
  const escaped = searchTerm.replace(/[%_\\]/g, "\\$&");
  return `%${escaped}%`;
}

/**
 * Escape LIKE pattern for safe searching
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Build case-insensitive LIKE search pattern
 */
export function buildLikeSearch(column: string, searchTerm: string): {
  condition: string;
  value: string;
} {
  const escaped = escapeLike(searchTerm);
  return {
    condition: `${column} ILIKE $1`,
    value: `%${escaped}%`,
  };
}
