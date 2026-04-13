import supabase from "./db";

/**
 * DATABASE HELPERS
 * This file provides utility functions for common database operations,
 * identifier generation, and compatibility layers between the old MySQL logic 
 * and the new Supabase (PostgreSQL) implementation.
 */

/**
 * Generates a unique identifier (UUID v4) for new database records.
 * Uses the built-in web crypto API for cryptographically strong random IDs.
 * @returns A string like '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * UTILITY: Boolean Converters
 * These help interpret truthy/falsy values from various inputs.
 * Since PostgreSQL handles native booleans, these are mostly for data cleaning.
 */
export function toBoolean(value: any): boolean {
  return value === true || value === 1 || value === "true";
}

export function fromBoolean(value: boolean): boolean {
  return value; // Direct return as Supabase/Postgres uses native boolean
}

/**
 * EXPORT DATABASE CLIENT
 * Re-exports the initialized Supabase client so it can be imported 
 * from db-helpers for convenience in server actions.
 */
export { supabase };

// ──────────────────────────────────────────────────────────────
// SEARCH HELPERS
// Utility functions to facilitate case-insensitive searching in PostgreSQL.
// ──────────────────────────────────────────────────────────────

/**
 * Prepares a search term for use with PostgreSQL's 'ilike' (case-insensitive search).
 * It escapes special characters like '%' and '_' to prevent search injections.
 * @param column - The database column name
 * @param searchTerm - The user-provided search string
 * @returns An escaped search pattern like '%search_term%'
 */
export function buildIlikeSearch(column: string, searchTerm: string): string {
  const escaped = searchTerm.replace(/[%_\\]/g, "\\$&"); // Escape %, _ and \
  return `%${escaped}%`;
}

/**
 * Escapes special characters in a string for use in a 'LIKE' comparison.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Legacy SEARCH Builder
 * Included for transition compatibility with older parts of the system.
 */
export function buildLikeSearch(column: string, searchTerm: string): {
  condition: string;
  value: string;
} {
  const escaped = escapeLike(searchTerm);
  return {
    condition: `${column} ILIKE $1`, // ILIKE is Postgres-specific for case-insensitive
    value: `%${escaped}%`,
  };
}

/**
 * DEPRECATED: Raw SQL Execution
 * Direct SQL queries are discouraged in Supabase; use the object-oriented 
 * .from('table').select() API instead for better type safety and security.
 */
export async function rawQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  throw new Error("rawQuery is deprecated. Use supabase.from() methods instead.");
}

