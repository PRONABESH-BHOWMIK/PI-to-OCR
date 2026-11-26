// app/api/checklist/save/route.js
// Save a full client (client fields + all financial-year records). Idempotent.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getClientIp, getToolSession } from '@/lib/checklist-auth';
import { saveClient } from '@/lib/checklist-data';

export async function POST(request) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }
  const session = getToolSession(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  try {
    const result = await saveClient(session.id, payload);
    const ip = getClientIp(request);
    await query('INSERT INTO tool_usage_logs (user_id, ip, action) VALUES ($1, $2, $3)', [session.id, ip, 'save']);
    return NextResponse.json({ ok: true, clientId: result.id });
  } catch (error) {
    const status = error.status || 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
