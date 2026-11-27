// app/api/checklist/reauth/route.js
// Re-confirm a tool user's identity before a sensitive action (deleting a
// client). The caller is already signed in; this endpoint requires them to
// re-enter their user ID and password and verifies them against the stored
// hash. It does not create a session and does not log a login event.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { checkPassword, getToolSession } from '@/lib/checklist-auth';

export async function POST(request) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }

  const session = getToolSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { username, password } = await request.json().catch(() => ({}));
  const providedUser = String(username || '').trim();

  const rows = await query(
    `SELECT id, username, password_hash AS passwordHash, status
       FROM tool_users WHERE username = $1`,
    [providedUser],
  );
  const user = rows?.[0];

  // Must match the signed-in account, be active, and have the correct password.
  if (
    !user ||
    user.id !== session.id ||
    user.status !== 'active' ||
    !checkPassword(String(password || ''), user.passwordHash)
  ) {
    return NextResponse.json({ error: 'Incorrect user ID or password' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
