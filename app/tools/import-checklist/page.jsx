'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { itemStatus, parseFy, fyStatus, todayIso } from '@/lib/checklist-core';

const clone = (value) => JSON.parse(JSON.stringify(value));

const VAT_OPTIONS = ['', 'yes', 'no', 'mixed'];
const MGT_OPTIONS = ['', 'yes', 'no', 'others'];
const SWIFT_OPTIONS = ['', 'yes', 'no'];

const STATE_STYLES = {
  valid: 'border-green-300 bg-green-50',
  expired: 'border-red-300 bg-red-50',
  uncollected: 'border-line bg-white',
};
const STATE_TEXT = {
  valid: 'text-green-800',
  expired: 'text-red-700',
  uncollected: 'text-mute',
};
const STATE_BADGE = {
  valid: 'bg-green-200 text-green-800',
  expired: 'bg-red-200 text-red-700',
  uncollected: 'bg-line text-mute',
};
const STATE_LABEL = { valid: 'Current', expired: 'Expired', uncollected: 'Not collected' };

export default function ImportChecklistPage() {
  const router = useRouter();
  const [username, setUsername] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null); // working copy of the selected client
  const [newClient, setNewClient] = useState({ name: '', ucic: '', ircNumber: '' });
  const [newFy, setNewFy] = useState('');
  const [duplicateMsg, setDuplicateMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = todayIso();

  const load = useCallback(async () => {
    const response = await fetch('/api/checklist/data', { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/tools/import-checklist/login');
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Could not load checklist data');
      return;
    }
    const data = await response.json();
    setUsername(data.username);
    setDocumentTypes(data.documentTypes || []);
    setClients(data.clients || []);
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/checklist/me', { cache: 'no-store' });
        if (!me.ok) {
          router.replace('/tools/import-checklist/login');
          return;
        }
        await load();
      } catch {
        router.replace('/tools/import-checklist/login');
      }
    })();
  }, [load, router]);

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId],
  );

  const openClient = (client) => {
    setSelectedId(client.id);
    setDraft(clone(client));
    setNotice('');
    setError('');
  };

  const addClient = async (event) => {
    event.preventDefault();
    setDuplicateMsg('');
    setNotice('');
    setError('');
    if (!newClient.ucic.trim()) {
      setError('UCIC is required');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/checklist/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) setDuplicateMsg(data.error || 'That UCIC already exists.');
        else setError(data.error || 'Could not create client');
        setBusy(false);
        return;
      }
      setNewClient({ name: '', ucic: '', ircNumber: '' });
      await load();
      openClient(data.client);
    } catch {
      setError('The server could not be reached');
    }
    setBusy(false);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/checklist/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: draft.id,
          name: draft.name,
          ucic: draft.ucic,
          ircNumber: draft.ircNumber,
          reminderPausedUntil: draft.reminderPausedUntil,
          fys: draft.fys,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) setDuplicateMsg(data.error || 'That UCIC already exists.');
        else setError(data.error || 'Could not save');
        setBusy(false);
        return;
      }
      setNotice('Saved.');
      await load();
    } catch {
      setError('The server could not be reached');
    }
    setBusy(false);
  };

  const removeClient = async () => {
    if (!draft || !window.confirm(`Delete ${draft.name} and all its data? This cannot be undone.`)) return;
    const response = await fetch(`/api/checklist/client/${draft.id}`, { method: 'DELETE' });
    if (response.ok) {
      setSelectedId(null);
      setDraft(null);
      setNotice('Client deleted.');
      await load();
    } else {
      setError('Could not delete client');
    }
  };

  const signOut = async () => {
    await fetch('/api/checklist/logout', { method: 'POST' });
    router.replace('/tools/import-checklist/login');
    router.refresh();
  };

  // ---- draft editing helpers ----
  const updateClientField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const getItem = (fy, name) => fy.items.find((i) => i.documentTypeName === name) || { documentTypeName: name, collected: false, expiryDate: null };
  const setItem = (fyIndex, name, patch) =>
    setDraft((d) => {
      const fys = d.fys.map((fy, i) => {
        if (i !== fyIndex) return fy;
        const existing = fy.items.find((it) => it.documentTypeName === name);
        const items = existing
          ? fy.items.map((it) => (it.documentTypeName === name ? { ...it, ...patch } : it))
          : [...fy.items, { documentTypeName: name, ...patch }];
        return { ...fy, items };
      });
      return { ...d, fys };
    });

  const addFy = () => {
    const parsed = parseFy(newFy.trim());
    if (!parsed) {
      setError('Financial year must look like 2026-27');
      return;
    }
    setError('');
    setDraft((d) => {
      const fys = [
        ...d.fys,
        {
          fyLabel: parsed.label,
          fyEndDate: parsed.end,
          commissionRate: '',
          vat: '',
          mgtFeeChoice: '',
          mgtFeeValue: '',
          swiftChoice: '',
          swiftValue: '',
          note: '',
          items: [],
          facilities: [],
          officers: [],
        },
      ];
      return { ...d, fys };
    });
    setNewFy('');
  };

  const removeFy = (fyIndex) =>
    setDraft((d) => ({ ...d, fys: d.fys.filter((_, i) => i !== fyIndex) }));

  const updateFy = (fyIndex, patch) =>
    setDraft((d) => ({ ...d, fys: d.fys.map((fy, i) => (i === fyIndex ? { ...fy, ...patch } : fy)) }));

  const addFacility = (fyIndex) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) => (i === fyIndex ? { ...fy, facilities: [...fy.facilities, { facilityNumber: '', linkedData: '' }] } : fy)),
    }));
  const updateFacility = (fyIndex, idx, patch) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) =>
        i === fyIndex ? { ...fy, facilities: fy.facilities.map((f, j) => (j === idx ? { ...f, ...patch } : f)) } : fy,
      ),
    }));
  const removeFacility = (fyIndex, idx) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) => (i === fyIndex ? { ...fy, facilities: fy.facilities.filter((_, j) => j !== idx) } : fy)),
    }));

  const addOfficer = (fyIndex) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) => (i === fyIndex ? { ...fy, officers: [...fy.officers, { email: '' }] } : fy)),
    }));
  const updateOfficer = (fyIndex, idx, patch) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) =>
        i === fyIndex ? { ...fy, officers: fy.officers.map((o, j) => (j === idx ? { ...o, ...patch } : o)) } : fy,
      ),
    }));
  const removeOfficer = (fyIndex, idx) =>
    setDraft((d) => ({
      ...d,
      fys: d.fys.map((fy, i) => (i === fyIndex ? { ...fy, officers: fy.officers.filter((_, j) => j !== idx) } : fy)),
    }));

  const field = (value) => ({
    value,
    onChange: (e) => e.target.value,
  });

  const inputCls = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Import Checklist</p>
          <h1 className="display text-5xl text-ink">Import client documents</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Track the required documents for each import client by financial year. Current documents show light
            green; expired or outdated ones show light red. Signed in as <span className="font-semibold text-ink">{username}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-mute transition hover:border-bottle hover:text-bottle"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {duplicateMsg && (
        <p role="alert" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {duplicateMsg}
        </p>
      )}
      {notice && <p className="mt-6 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

      {/* Add client */}
      <form onSubmit={addClient} className="mt-6 grid gap-4 rounded-xl border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Client name</span>
          <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className={inputCls} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">UCIC</span>
          <input value={newClient.ucic} onChange={(e) => setNewClient({ ...newClient, ucic: e.target.value })} className={inputCls} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">IRC number</span>
          <input value={newClient.ircNumber} onChange={(e) => setNewClient({ ...newClient, ircNumber: e.target.value })} className={inputCls} />
        </label>
        <button type="submit" disabled={busy} className="self-end rounded-lg bg-bottle px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60">
          Add client
        </button>
      </form>

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Client list */}
        <section>
          <h2 className="display text-2xl text-ink">Clients</h2>
          {clients.length === 0 && <p className="mt-4 text-sm text-mute">No clients yet. Add one above.</p>}
          <ul className="mt-4 space-y-2">
            {clients.map((c) => {
              const latest = [...c.fys].sort((a, b) => (a.fyEndDate < b.fyEndDate ? 1 : -1))[0];
              const counts = latest ? fyStatus(latest, documentTypes, today) : { expired: 0, valid: 0, uncollected: 0 };
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openClient(c)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      selectedId === c.id ? 'border-bottle bg-paper' : 'border-line bg-white hover:border-bottle'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{c.name}</span>
                      {counts.expired > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_BADGE.expired}`}>
                          {counts.expired} expired
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-mute">UCIC {c.ucic}{c.fys.length ? ` · ${c.fys.length} FY` : ''}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Editor */}
        <section>
          {!draft ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center text-mute">
              Select a client to manage its checklist, or add a new client.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Client header */}
              <div className="rounded-xl border border-line bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Client name</span>
                    <input value={draft.name} onChange={(e) => updateClientField('name', e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">UCIC</span>
                    <input value={draft.ucic} onChange={(e) => updateClientField('ucic', e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">IRC number</span>
                    <input value={draft.ircNumber} onChange={(e) => updateClientField('ircNumber', e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Reminders paused until</span>
                    <input
                      type="date"
                      value={draft.reminderPausedUntil || ''}
                      onChange={(e) => updateClientField('reminderPausedUntil', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-mute">
                  Set a future date to pause reminder emails for this client until that date.
                </p>
              </div>

              {/* Financial year selector */}
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Financial year</label>
                  <select
                    value={draft.fys.length ? draft.fys.map((f) => f.fyLabel).join('') : ''}
                    disabled
                    className={`${inputCls} max-w-[180px]`}
                  >
                    {draft.fys.map((f) => (
                      <option key={f.fyLabel} value={f.fyLabel}>
                        {f.fyLabel} (ends {f.fyEndDate})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newFy}
                    onChange={(e) => setNewFy(e.target.value)}
                    placeholder="e.g. 2027-28"
                    className={`${inputCls} w-32`}
                  />
                  <button type="button" onClick={addFy} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-bottle">
                    Add FY
                  </button>
                </div>
              </div>

              {/* Each FY block */}
              {draft.fys.map((fy, fyIndex) => (
                <FyEditor
                  key={fy.fyLabel + fyIndex}
                  fy={fy}
                  fyIndex={fyIndex}
                  documentTypes={documentTypes}
                  today={today}
                  onUpdateFy={updateFy}
                  onSetItem={setItem}
                  onAddFacility={addFacility}
                  onUpdateFacility={updateFacility}
                  onRemoveFacility={removeFacility}
                  onAddOfficer={addOfficer}
                  onUpdateOfficer={updateOfficer}
                  onRemoveOfficer={removeOfficer}
                  onRemoveFy={removeFy}
                  inputCls={inputCls}
                  stateStyles={STATE_STYLES}
                  stateText={STATE_TEXT}
                  stateBadge={STATE_BADGE}
                  stateLabel={STATE_LABEL}
                  getItem={getItem}
                  itemStatus={itemStatus}
                  vatOptions={VAT_OPTIONS}
                  mgtOptions={MGT_OPTIONS}
                  swiftOptions={SWIFT_OPTIONS}
                />
              ))}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-lg bg-bottle px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-bottle-dark disabled:opacity-60"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={removeClient}
                  className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300"
                >
                  Delete client
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FyEditor({
  fy, fyIndex, documentTypes, today, onUpdateFy, onSetItem,
  onAddFacility, onUpdateFacility, onRemoveFacility,
  onAddOfficer, onUpdateOfficer, onRemoveOfficer, onRemoveFy,
  inputCls, stateStyles, stateText, stateBadge, stateLabel, getItem, itemStatus,
  vatOptions, mgtOptions, swiftOptions,
}) {
  const fyDef = documentTypes;
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="display text-2xl text-ink">{fy.fyLabel}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-mute">FY ends {fy.fyEndDate}</span>
          <button type="button" onClick={() => onRemoveFy(fyIndex)} className="text-xs font-semibold text-red-600 hover:underline">
            remove FY
          </button>
        </div>
      </div>

      {/* Document checklist */}
      <h4 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-mute">Documents</h4>
      <div className="space-y-2">
        {fyDef.map((d) => {
          const item = getItem(fy, d.name);
          const { state } = itemStatus(item, { kind: d.kind, fyEndDate: fy.fyEndDate, today });
          return (
            <div key={d.name} className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 ${stateStyles[state]}`}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(item.collected)}
                  onChange={(e) => onSetItem(fyIndex, d.name, { collected: e.target.checked })}
                  className="h-4 w-4 accent-bottle"
                />
                {d.name}
              </label>
              {d.kind === 'dated' ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-mute">expiry</span>
                  <input
                    type="date"
                    value={item.expiryDate || ''}
                    onChange={(e) => onSetItem(fyIndex, d.name, { expiryDate: e.target.value })}
                    className={`${inputCls} w-40`}
                  />
                </label>
              ) : (
                <span className="text-xs text-mute">expires with the FY ({fy.fyEndDate})</span>
              )}
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${stateBadge[state]}`}>
                {stateLabel[state]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Always-current data fields */}
      <h4 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-mute">Data</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">LC issue commission rate</span>
          <input value={fy.commissionRate} onChange={(e) => onUpdateFy(fyIndex, { commissionRate: e.target.value })} className={inputCls} placeholder="e.g. 1.5" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">VAT</span>
          <select value={fy.vat} onChange={(e) => onUpdateFy(fyIndex, { vat: e.target.value })} className={inputCls}>
            {vatOptions.map((o) => <option key={o || 'none'} value={o}>{o || '— select —'}</option>)}
          </select>
        </label>

        <div className="sm:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Mgt Confirmation fee</span>
              <select value={fy.mgtFeeChoice} onChange={(e) => onUpdateFy(fyIndex, { mgtFeeChoice: e.target.value })} className={inputCls}>
                {mgtOptions.map((o) => <option key={o || 'none'} value={o}>{o || '— select —'}</option>)}
              </select>
            </label>
            {fy.mgtFeeChoice === 'others' && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Mgt Confirmation fee — detail</span>
                <input value={fy.mgtFeeValue} onChange={(e) => onUpdateFy(fyIndex, { mgtFeeValue: e.target.value })} className={inputCls} />
              </label>
            )}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">SPECIAL SWIFT CHARGE</span>
          <select value={fy.swiftChoice} onChange={(e) => onUpdateFy(fyIndex, { swiftChoice: e.target.value })} className={inputCls}>
            {swiftOptions.map((o) => <option key={o || 'none'} value={o}>{o === 'yes' ? 'Yes' : o === 'no' ? 'No' : '— select —'}</option>)}
          </select>
        </label>
        {fy.swiftChoice === 'yes' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Special SWIFT charge — amount</span>
            <input value={fy.swiftValue} onChange={(e) => onUpdateFy(fyIndex, { swiftValue: e.target.value })} className={inputCls} />
          </label>
        )}
        {fy.swiftChoice === 'no' && (
          <p className="self-end text-sm font-semibold text-mute">No</p>
        )}
      </div>

      {/* Facility numbers (repeatable, each with linked data) */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-mute">Facility numbers</span>
          <button type="button" onClick={() => onAddFacility(fyIndex)} className="text-xs font-semibold text-bottle hover:underline">
            + add facility
          </button>
        </div>
        <div className="space-y-2">
          {fy.facilities.length === 0 && <p className="text-sm text-mute">No facility numbers.</p>}
          {fy.facilities.map((f, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <label className="flex-1">
                <span className="mb-1.5 block text-xs text-mute">Facility number</span>
                <input value={f.facilityNumber} onChange={(e) => onUpdateFacility(fyIndex, i, { facilityNumber: e.target.value })} className={inputCls} />
              </label>
              <label className="flex-1">
                <span className="mb-1.5 block text-xs text-mute">Linked data</span>
                <input value={f.linkedData} onChange={(e) => onUpdateFacility(fyIndex, i, { linkedData: e.target.value })} className={inputCls} />
              </label>
              <button type="button" onClick={() => onRemoveFacility(fyIndex, i)} className="text-xs font-semibold text-red-600 hover:underline">
                remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dealing officer emails (repeatable) */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-mute">Dealing officer emails</span>
          <button type="button" onClick={() => onAddOfficer(fyIndex)} className="text-xs font-semibold text-bottle hover:underline">
            + add email
          </button>
        </div>
        <div className="space-y-2">
          {fy.officers.length === 0 && <p className="text-sm text-mute">No dealing-officer email. Reminders will not be sent.</p>}
          {fy.officers.map((o, i) => (
            <div key={i} className="flex items-end gap-3">
              <label className="flex-1">
                <span className="mb-1.5 block text-xs text-mute">Email</span>
                <input type="email" value={o.email} onChange={(e) => onUpdateOfficer(fyIndex, i, { email: e.target.value })} className={inputCls} />
              </label>
              <button type="button" onClick={() => onRemoveOfficer(fyIndex, i)} className="text-xs font-semibold text-red-600 hover:underline">
                remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">User's special note</span>
        <textarea value={fy.note} onChange={(e) => onUpdateFy(fyIndex, { note: e.target.value })} rows={2} className={inputCls} />
      </label>
    </div>
  );
}
