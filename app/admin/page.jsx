'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  rate_limited: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(todayIso(-29));
  const [end, setEnd] = useState(todayIso(0));

  const load = useCallback(async (range) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/stats?start=${range.start}&end=${range.end}`, { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Could not load usage statistics');
        setStats(null);
        return;
      }
      setStats(data);
    } catch {
      setError('The server could not be reached');
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/admin/login');
          return;
        }
        const me = await response.json();
        if (cancelled) return;
        setUsername(me.username);
        await load({ start, end });
      } catch {
        router.replace('/admin/login');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount; start/end only feed the initial range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = (event) => {
    event.preventDefault();
    load({ start, end });
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  };

  if (username === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-mute">Checking your session…</p>
      </div>
    );
  }

  const totals = stats?.totals ?? { requests: 0, uniqueIps: 0, byTool: {}, byStatus: {} };
  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((d) => d.requests));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Admin</p>
          <h1 className="display text-5xl text-ink">Usage dashboard</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Tool usage recorded by the site, across all tools. Signed in as <span className="font-semibold text-ink">{username}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-bottle hover:text-bottle"
        >
          Sign out
        </button>
      </div>

      <nav aria-label="Admin" className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/checklist"
          className="rounded-lg border border-bottle/40 bg-bottle/5 px-4 py-2 text-sm font-semibold text-bottle transition hover:border-bottle hover:bg-bottle/10"
        >
          Client data check management
        </Link>
        <span className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-mute">
          Usage dashboard
        </span>
      </nav>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={applyRange} className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">From</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">To</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-bottle px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60"
        >
          {busy ? 'Loading…' : 'Apply'}
        </button>
      </form>

      {stats && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-mute">Requests in range</p>
              <p className="display mt-2 text-4xl text-ink">{totals.requests}</p>
              <p className="mt-1 text-sm text-mute">{stats.range.start} – {stats.range.end}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-mute">Unique IPs</p>
              <p className="display mt-2 text-4xl text-ink">{totals.uniqueIps}</p>
              <p className="mt-1 text-sm text-mute">distinct visitors in range</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-mute">AI rate limit</p>
              <p className="display mt-2 text-4xl text-ink">{stats.rateLimit.perDay}</p>
              <p className="mt-1 text-sm text-mute">requests/day per IP on {stats.rateLimit.tool}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-mute">Today</p>
              <p className="display mt-2 text-4xl text-ink">
                {stats.daily.filter((d) => d.date === todayIso()).reduce((sum, d) => sum + d.requests, 0)}
              </p>
              <p className="mt-1 text-sm text-mute">requests so far today (UTC)</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-line bg-white p-6">
              <h2 className="display text-2xl text-ink">By tool</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-mute">
                    <th className="py-2 pr-4">Tool</th>
                    <th className="py-2 pr-4 text-right">Requests</th>
                    <th className="py-2 pr-4 text-right">IPs</th>
                    <th className="py-2">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tools.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-mute">No usage recorded in this range.</td></tr>
                  )}
                  {stats.tools.map((tool) => (
                    <tr key={tool.tool} className="border-b border-line/60">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{tool.tool}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{tool.requests}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{tool.unique_ips}</td>
                      <td className="py-2.5 text-mute">{fmtDate(tool.lastUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-line bg-white p-6">
              <h2 className="display text-2xl text-ink">By status</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-mute">
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.statuses.length === 0 && (
                    <tr><td colSpan={2} className="py-4 text-mute">No usage recorded in this range.</td></tr>
                  )}
                  {stats.statuses.map((row) => (
                    <tr key={row.status} className="border-b border-line/60">
                      <td className="py-2.5 pr-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] || 'border-line bg-paper text-mute'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{row.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="display mt-8 text-2xl text-ink">Daily requests</h2>
              <div className="mt-4 flex h-32 items-end gap-1.5">
                {stats.daily.length === 0 && <p className="text-sm text-mute">No usage recorded in this range.</p>}
                {stats.daily.map((day) => (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-bottle/80"
                      style={{ height: `${Math.max(4, (day.requests / maxDaily) * 100)}%` }}
                      title={`${day.date}: ${day.requests} requests`}
                    />
                    <span className="text-[10px] text-mute">{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-line bg-white p-6">
            <h2 className="display text-2xl text-ink">Recent activity</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-mute">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Tool</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Pages</th>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-mute">No usage recorded yet.</td></tr>
                  )}
                  {stats.recent.map((row) => (
                    <tr key={row.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-4 text-mute">{fmtDate(row.createdAt)}</td>
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.tool}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] || 'border-line bg-paper text-mute'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{row.pages}</td>
                      <td className="py-2.5 pr-4 text-mute">{row.model || '—'}</td>
                      <td className="py-2.5 font-mono text-xs text-mute">{row.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
