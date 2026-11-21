// api/admin/me.js
// Report the currently signed-in admin, or 401.
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';

export async function GET(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ username: session.username });
}
