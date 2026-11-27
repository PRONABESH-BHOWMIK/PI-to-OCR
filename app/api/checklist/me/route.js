// app/api/checklist/me/route.js
// Return the current tool-user session, or 401.
import { NextResponse } from 'next/server';
import { getToolSession } from '@/lib/checklist-auth';

export async function GET(request) {
  const session = getToolSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json({ username: session.username, id: session.id });
}
