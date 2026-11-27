// app/api/checklist/client/[id]/route.js
// DELETE a client (and its financial-year records) owned by the tool user.
import { NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/db';
import { getToolSession } from '@/lib/checklist-auth';
import { deleteClient } from '@/lib/checklist-data';

export async function DELETE(request, { params }) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }
  const session = getToolSession(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ error: 'Invalid client id' }, { status: 400 });
  }

  const deleted = await deleteClient(session.id, clientId);
  if (!deleted) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
