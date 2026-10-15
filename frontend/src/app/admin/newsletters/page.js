'use client';

/**
 * Place at: frontend/src/app/admin/newsletters/page.js
 * Write a newsletter, send yourself a test, then send it to everyone on the subscriber list.
 *   GET /api/newsletters · POST /api/newsletters/test · POST /api/newsletters · GET /api/subscribe?limit=1 (for the count)
 * Every email carries its own unsubscribe link (added by the server); you only write the message.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { API_URL } from '@/lib/imageUrl';
import './admin-newsletters.css';

const EMPTY = { subject: '', body: '', buttonLabel: '', buttonUrl: '' };
const BADGE = { sending: 'processing', sent: 'delivered', failed: 'cancelled' };

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function AdminNewslettersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [subscribers, setSubscribers] = useState(null); // how many people will get it
  const [history, setHistory] = useState([]);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(''); // '' | 'test' | 'send'
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/newsletters?limit=10`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setHistory(data.newsletters || []);
      setState('ready');
    } catch {
      setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscribe?limit=1`, { credentials: 'include' });
      if (res.ok) setSubscribers((await res.json()).total ?? 0);
    } catch {
      /* the count is a nicety */
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadHistory();
      loadCount();
    }
  }, [authLoading, isAdmin, loadHistory, loadCount]);

  // While a send is running, refresh the progress every few seconds
  const sending = history.some((n) => n.status === 'sending');
  useEffect(() => {
    if (!sending) return undefined;
    const timer = setInterval(loadHistory, 3000);
    return () => clearInterval(timer);
  }, [sending, loadHistory]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const post = async (path) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  };

  const sendTest = async () => {
    setBusy('test');
    setError('');
    try {
      const data = await post('/api/newsletters/test');
      setToast(data.message || 'Test sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const sendAll = async (e) => {
    e.preventDefault();
    if (busy || sending) return;
    const who = subscribers === null ? 'everyone on the subscriber list' : `${subscribers.toLocaleString()} ${subscribers === 1 ? 'subscriber' : 'subscribers'}`;
    if (!window.confirm(`Send “${form.subject.trim() || '(no subject)'}” to ${who}?\n\nThis can't be undone. Have you sent yourself a test first?`)) return;
    setBusy('send');
    setError('');
    try {
      await post('/api/newsletters');
      setForm(EMPTY);
      setToast('Sending started');
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const when = (d) => new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <AdminShell
      title="Newsletter"
      actions={
        <Link href="/admin/subscribers" className="adm__btn adm__btn--ghost" style={{ textDecoration: 'none' }}>
          Subscribers{subscribers !== null ? ` (${subscribers.toLocaleString()})` : ''}
        </Link>
      }
    >
      <form className="nl__form" onSubmit={sendAll}>
        <label className="nl__field">
          <span>Subject</span>
          <input type="text" value={form.subject} onChange={set('subject')} maxLength={150} placeholder="The autumn edit is here" required />
        </label>
        <label className="nl__field">
          <span>
            Message <em>{form.body.length.toLocaleString()}/10,000</em>
          </span>
          <textarea value={form.body} onChange={set('body')} rows={10} maxLength={10000} placeholder={'Write plain text. Leave a blank line to start a new paragraph.'} required />
        </label>
        <div className="nl__row">
          <label className="nl__field">
            <span>Button label (optional)</span>
            <input type="text" value={form.buttonLabel} onChange={set('buttonLabel')} maxLength={40} placeholder="Shop the collection" />
          </label>
          <label className="nl__field">
            <span>Button link</span>
            <input type="url" value={form.buttonUrl} onChange={set('buttonUrl')} maxLength={500} placeholder="https://" />
          </label>
        </div>
        <p className="adm__note">Every email automatically ends with an unsubscribe link for that reader.</p>

        {error && (
          <p className="adm__note is-error" role="alert">
            {error}
          </p>
        )}

        <div className="nl__actions">
          <button type="button" className="adm__btn adm__btn--ghost" onClick={sendTest} disabled={!!busy || !form.subject.trim() || !form.body.trim()}>
            {busy === 'test' ? 'Sending test…' : `Send test to ${user?.email || 'me'}`}
          </button>
          <button type="submit" className="adm__btn" disabled={!!busy || sending || subscribers === 0 || !form.subject.trim() || !form.body.trim()}>
            {busy === 'send' ? 'Starting…' : sending ? 'A send is in progress…' : subscribers === null ? 'Send to all subscribers' : `Send to ${subscribers.toLocaleString()} ${subscribers === 1 ? 'subscriber' : 'subscribers'}`}
          </button>
        </div>
      </form>

      <h2 className="nl__h">Sent newsletters</h2>
      {state === 'loading' && <p className="adm__note">Loading…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load the history. <button type="button" onClick={loadHistory}>Retry</button>
        </p>
      )}
      {state === 'ready' && history.length === 0 && <p className="adm__note">Nothing sent yet.</p>}
      {history.length > 0 && (
        <ul className="adm__list">
          {history.map((n) => (
            <li key={n._id} className="adm__card">
              <div className="adm__cardtop">
                <div>
                  <strong>
                    {n.subject} <span className={`adm__badge adm__badge--${BADGE[n.status] || 'processing'}`}>{n.status}</span>
                  </strong>
                  <span className="adm__meta">
                    {when(n.createdAt)} · {n.sent.toLocaleString()} of {n.recipients.toLocaleString()} sent
                    {n.failed > 0 ? ` · ${n.failed.toLocaleString()} failed` : ''}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toast && <div className="adm__toast">{toast}</div>}

    </AdminShell>
  );
}
