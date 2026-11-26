// app/api/admin/checklist/stats/route.js
// Admin view of checklist tool activity: daily logins (with IPs) and daily
// usage counts. Admins never see client data.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getSession } from '@/lib/admin-auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isoDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);

export async function GET(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const params = request.nextUrl.searchParams;
  const today = isoDay(new Date());
  const end = params.get('end') || today;
  const start = params.get('start') || isoDay(new Date(Date.now() - 29 * 86400000));
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  const startIso = `${start}T00:00:00Z`;
  const endIso = `${end}T23:59:59.999Z`;

  const [logins, usage, users] = await Promise.all([
    query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS count,
              ARRAY_AGG(ip ORDER BY created_at DESC) AS ips
         FROM tool_login_events
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY day ORDER BY day`,
      [startIso, endIso],
    ),
    query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS count
         FROM tool_usage_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY day ORDER BY day`,
      [startIso, endIso],
    ),
    query(
      `SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM tool_users`,
    ),
  ]);

  const loginByDay = new Map(logins?.map((r) => [r.day.slice(0, 10), r]) ?? []);
  const usageByDay = new Map(usage?.map((r) => [r.day.slice(0, 10), r.count]) ?? []);

  // Fill every day in the range so the chart is continuous.
  const days = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  while (cursor <= endDate) {
    const key = isoDay(cursor);
    const l = loginByDay.get(key);
    days.push({
      date: key,
      logins: l?.count ?? 0,
      loginIps: (l?.ips ?? []).filter(Boolean),
      usage: usageByDay.get(key) ?? 0,
    });
    cursor = new Date(cursor.getTime() + 86400000);
  }

  return NextResponse.json({
    range: { start, end },
    totals: {
      logins: days.reduce((s, d) => s + d.logins, 0),
      usage: days.reduce((s, d) => s + d.usage, 0),
    },
    users: users?.[0] ?? { n: 0, active: 0 },
    daily: days,
  });
}
