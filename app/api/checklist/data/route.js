// app/api/checklist/data/route.js
// GET  - load all checklist data for the signed-in tool user.
// POST - create a new client (name, UCIC, IRC number); duplicate UCIC -> 409.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getClientIp, getToolSession } from '@/lib/checklist-auth';
import { createClient, loadUserData } from '@/lib/checklist-data';

async function logUsage(userId, ip, action) {
  // Best-effort usage logging for the admin's per-day usage count.
  await query('INSERT INTO tool_usage_logs (user_id, ip, action) VALUES ($1, $2, $3)', [userId, ip, action]);
}

export async function GET(request) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }
  const session = getToolSession(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const ip = getClientIp(request);
  await logUsage(session.id, ip, 'load');

  const data = await loadUserData(session.id);
  return NextResponse.json({ username: session.username, ...data });
}

export async function POST(request) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }
  const session = getToolSession(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { name, ucic, ircNumber } = await request.json().catch(() => ({}));
  try {
    const client = await createClient(session.id, { name, ucic, ircNumber });
    return NextResponse.json({ ok: true, client });
  } catch (error) {
    const status = error.status || 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
