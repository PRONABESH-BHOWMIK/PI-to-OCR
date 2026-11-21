// api/admin/stats.js
// Usage statistics for the admin dashboard: totals, per-tool and per-status
// breakdowns, a daily series and the most recent activity rows, over a date
// range (?start=YYYY-MM-DD&end=YYYY-MM-DD, default: last 30 days).
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { dbEnabled, query } from '@/lib/db';
import { RATE_LIMIT_PER_DAY, RATE_LIMIT_TOOL } from '@/lib/usage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

export async function GET(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!dbEnabled) {
    return NextResponse.json(
      {
        error:
          'Postgres is not configured. Set POSTGRES_URL (Vercel sets it automatically once a Postgres database is linked) and run scripts/sql/schema.sql to create the usage_logs table.',
      },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const today = isoDay(new Date());
  const end = params.get('end') || today;
  const start = params.get('start') || isoDay(new Date(Date.now() - 29 * 86400000));
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: 'Invalid date range: use start=YYYY-MM-DD and end=YYYY-MM-DD' }, { status: 400 });
  }
  const startIso = `${start}T00:00:00Z`;
  const endIso = `${end}T23:59:59.999Z`;

  const [totals, byTool, byStatus, daily, recent] = await Promise.all([
    query(
      'SELECT COUNT(*)::int AS requests, COUNT(DISTINCT ip)::int AS unique_ips FROM usage_logs WHERE created_at >= $1 AND created_at <= $2',
      [startIso, endIso],
    ),
    query(
      `SELECT tool,
              COUNT(*)::int                                AS requests,
              COUNT(DISTINCT ip)::int                      AS unique_ips,
              MAX(created_at)                              AS last_used
         FROM usage_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY tool
        ORDER BY requests DESC`,
      [startIso, endIso],
    ),
    query(
      `SELECT status, COUNT(*)::int AS requests
         FROM usage_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY status
        ORDER BY requests DESC`,
      [startIso, endIso],
    ),
    query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS requests
         FROM usage_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY day
        ORDER BY day`,
      [startIso, endIso],
    ),
    query(
      `SELECT id, tool, status, pages, model, ip, created_at
         FROM usage_logs
        ORDER BY created_at DESC
        LIMIT 50`,
    ),
  ]);

  return NextResponse.json({
    range: { start, end },
    totals: {
      requests: totals?.[0]?.requests ?? 0,
      uniqueIps: totals?.[0]?.unique_ips ?? 0,
      byTool: Object.fromEntries(byTool?.map((r) => [r.tool, r.requests]) ?? []),
      byStatus: Object.fromEntries(byStatus?.map((r) => [r.status, r.requests]) ?? []),
    },
    tools: byTool?.map((r) => ({ ...r, lastUsed: r.last_used ? new Date(r.last_used).toISOString() : null })) ?? [],
    statuses: byStatus ?? [],
    daily: daily?.map((r) => ({ date: r.day.slice(0, 10), requests: r.requests })) ?? [],
    recent: recent?.map((r) => ({ ...r, createdAt: new Date(r.created_at).toISOString() })) ?? [],
    rateLimit: { tool: RATE_LIMIT_TOOL, perDay: RATE_LIMIT_PER_DAY },
  });
}
