// lib/db.js
// Neon / Vercel Postgres access through @vercel/postgres.
//
// The driver reads POSTGRES_URL from the environment (Vercel sets this
// automatically once the project is linked to a Postgres database, e.g. Neon).
// DATABASE_URL is also accepted so local development can point at any
// PostgreSQL server. When neither is configured the site keeps working: usage
// rows are skipped and rate limiting falls back to an in-memory counter
// (see lib/usage.js).
import { createPool } from '@vercel/postgres';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const pool = connectionString ? createPool({ connectionString }) : null;

export const dbEnabled = Boolean(pool);

/**
 * Run a parameterized query. Returns rows, or null when no database is
 * configured. Never throws: a failing query is reported by the caller.
 */
export async function query(text, params = []) {
  if (!pool) return null;
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Run a function inside a single transaction on one pooled connection.
 * Rolls back if the function throws. Throws when no database is configured or
 * the transaction fails, so the caller can report the error.
 */
export async function withTransaction(fn) {
  if (!pool) throw new Error('database not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // rollback failure is masked by the original error
    }
    throw error;
  } finally {
    client.release();
  }
}
