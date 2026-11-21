'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Login failed');
        setBusy(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('The server could not be reached');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-[8px_8px_0_#0E4D3A]">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Admin</p>
        <h1 className="display text-4xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-mute">
          Use the admin account configured for this site to view tool usage.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-bottle px-5 py-3 font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
