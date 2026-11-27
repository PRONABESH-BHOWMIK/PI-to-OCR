// app/api/checklist/logout/route.js
// Clear the tool-user session cookie.
import { NextResponse } from 'next/server';
import { TOOL_SESSION_COOKIE } from '@/lib/checklist-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TOOL_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
