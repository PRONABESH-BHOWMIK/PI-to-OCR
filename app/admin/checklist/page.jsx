'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  active: 'border-green-200 bg-green-50 text-green-700',
  paused: 'border-amber-200 bg-amber-50 text-amber-700',
  deactivated: 'border-red-200 bg-red-50 text-red-700',
};

export default function AdminChecklistPage() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [users, setUsers] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [newType, setNewType] = useState({ name: '', kind: 'dated' });
  const [range, setRange] = useState({ start: todayIso(-29), end: todayIso(0) });

  const loadUsers = useCallback(async () => {
    const r = await fetch('/api/admin/checklist/users', { cache: 'no-store' });
    if (r.status === 401) { router.replace('/admin/login'); return; }
    if (r.ok) setUsers((await r.json()).users || []);
  }, [router]);

  const loadTypes = useCallback(async () => {
    const r = await fetch('/api/admin/checklist/document-types', { cache: 'no-store' });
    if (r.ok) setDocumentTypes((await r.json()).documentTypes || []);
  }, []);

  const loadStats = useCallback(async (range) => {
    const r = await fetch(`/api/admin/checklist/stats?start=${range.start}&end=${range.end}`, { cache: 'no-store' });
    if (r.status === 401) { router.replace('/admin/login'); return; }
    if (r.ok) setStats(await r.json());
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!me.ok) { router.replace('/admin/login'); return; }
        setUsername((await me.json()).username);
        await Promise.all([loadUsers(), loadTypes(), loadStats(range)]);
      } catch {
        router.replace('/admin/login');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = async (url, options) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch(url, options);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || 'Request failed');
        return null;
      }
      setNotice(data.ok ? 'Done.' : '');
      return data;
    } catch {
      setError('The server could not be reached');
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    const data = await api('/api/admin/checklist/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (data) { setNewUser({ username: '', password: '' }); await loadUsers(); }
  };

  const setStatus = async (id, status) => {
    await api(`/api/admin/checklist/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadUsers();
  };

  const resetPassword = async (id) => {
    const pw = window.prompt('New password (min 6 characters):');
    if (!pw) return;
    await api(`/api/admin/checklist/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    await loadUsers();
  };

  const removeUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}" and all their client data?`)) return;
    await api(`/api/admin/checklist/users/${id}`, { method: 'DELETE' });
    await loadUsers();
  };

  const addType = async (e) => {
    e.preventDefault();
    const data = await api('/api/admin/checklist/document-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newType),
    });
    if (data) { setNewType({ name: '', kind: 'dated' }); await loadTypes(); }
  };

  const removeType = async (id, name) => {
    if (!window.confirm(`Remove document type "${name}"?`)) return;
    await api(`/api/admin/checklist/document-types?id=${id}`, { method: 'DELETE' });
    await loadTypes();
  };

  if (username === null) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-mute sm:px-6">Checking your session…</div>;
  }

  const maxLogin = Math.max(1, ...(stats?.daily ?? []).map((d) => d.logins));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Admin</p>
          <h1 className="display text-5xl text-ink">Checklist tool management</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Manage tool user IDs and document types, and view daily checklist activity. Admins cannot see client data.
          </p>
        </div>
        <Link href="/admin" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-bottle hover:text-bottle">
          ← Back to dashboard
        </Link>
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-6 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

      {/* Users */}
      <section className="mt-8 rounded-xl border border-line bg-white p-6">
        <h2 className="display text-2xl text-ink">Tool users</h2>
        <form onSubmit={createUser} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">User ID</span>
            <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Password</span>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30" required />
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-bottle px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60">Create user</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-mute">
                <th className="py-2 pr-4">User ID</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Clients</th>
                <th className="py-2 pr-4">Last login</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={5} className="py-4 text-mute">No tool users yet.</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60">
                  <td className="py-2.5 pr-4 font-semibold text-ink">{u.username}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[u.status] || 'border-line bg-paper text-mute'}`}>{u.status}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{u.clientCount}</td>
                  <td className="py-2.5 pr-4 text-mute">{fmtDate(u.lastLogin)}</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-2">
                      {u.status !== 'active' && (
                        <button type="button" onClick={() => setStatus(u.id, 'active')} className="text-xs font-semibold text-bottle hover:underline">Activate</button>
                      )}
                      {u.status === 'active' && (
                        <button type="button" onClick={() => setStatus(u.id, 'paused')} className="text-xs font-semibold text-amber-700 hover:underline">Pause</button>
                      )}
                      {u.status !== 'deactivated' && (
                        <button type="button" onClick={() => setStatus(u.id, 'deactivated')} className="text-xs font-semibold text-red-600 hover:underline">Deactivate</button>
                      )}
                      <button type="button" onClick={() => resetPassword(u.id)} className="text-xs font-semibold text-bottle hover:underline">Reset password</button>
                      <button type="button" onClick={() => removeUser(u.id, u.username)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Document types */}
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="display text-2xl text-ink">Document types</h2>
          <form onSubmit={addType} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Name</span>
              <input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Kind</span>
              <select value={newType.kind} onChange={(e) => setNewType({ ...newType, kind: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30">
                <option value="dated">Dated (manual expiry)</option>
                <option value="fy_based">With the financial year</option>
              </select>
            </label>
            <button type="submit" disabled={busy} className="rounded-lg bg-bottle px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60">Add</button>
          </form>
          <ul className="mt-4 space-y-1.5">
            {documentTypes.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="font-medium text-ink">{d.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-mute">{d.kind === 'fy_based' ? 'FY-based' : 'dated'}</span>
                  <button type="button" onClick={() => removeType(d.id, d.name)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Activity */}
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="display text-2xl text-ink">Daily activity</h2>
          {stats && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Logins (range)</p>
                  <p className="display mt-1 text-3xl text-ink">{stats.totals.logins}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Usage (range)</p>
                  <p className="display mt-1 text-3xl text-ink">{stats.totals.usage}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Tool users</p>
                  <p className="display mt-1 text-3xl text-ink">{stats.users.n}</p>
                  <p className="text-xs text-mute">{stats.users.active} active</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); loadStats(range); }} className="mt-5 flex items-end gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">From</span>
                  <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">To</span>
                  <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle" />
                </label>
                <button type="submit" disabled={busy} className="rounded-lg bg-bottle px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60">Apply</button>
              </form>
              <div className="mt-5 flex h-28 items-end gap-1.5">
                {stats.daily.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-bottle/80" style={{ height: `${Math.max(4, (d.logins / maxLogin) * 100)}%` }} title={`${d.date}: ${d.logins} logins, ${d.usage} uses`} />
                    <span className="text-[10px] text-mute">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold text-bottle">Logins by IP (per day)</summary>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {stats.daily.filter((d) => d.logins > 0).map((d) => (
                    <div key={d.date} className="border-b border-line/60 py-1.5 text-xs">
                      <span className="font-semibold text-ink">{d.date}</span>
                      <span className="text-mute"> · {d.logins} login(s) · {d.loginIps.join(', ') || 'no IP'}</span>
                    </div>
                  ))}
                  {stats.daily.every((d) => d.logins === 0) && <p className="text-sm text-mute">No logins in this range.</p>}
                </div>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
