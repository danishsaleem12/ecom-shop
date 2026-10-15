'use client';

/**
 * Place at: frontend/src/app/admin/messages/page.js
 * Messages sent through the website's contact form.
 *   GET /api/contact · PATCH /api/contact/:id · DELETE /api/contact/:id
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { API_URL } from '@/lib/imageUrl';

export default function AdminMessagesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState('loading');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`${API_URL}/api/contact`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setMessages(data.messages || []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setRead = async (m, read) => {
    try {
      const res = await fetch(`${API_URL}/api/contact/${m._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) throw new Error('failed');
      setMessages((list) => list.map((x) => (x._id === m._id ? { ...x, read } : x)));
    } catch {
      setToast('Could not update the message');
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/contact/${m._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setMessages((list) => list.filter((x) => x._id !== m._id));
      setToast('Message deleted');
    } catch {
      setToast('Could not delete — try again');
    }
  };

  const unread = messages.filter((m) => !m.read).length;
  const shown = onlyUnread ? messages.filter((m) => !m.read) : messages;

  return (
    <AdminShell
      title="Messages"
      actions={
        <button type="button" className="adm__btn adm__btn--ghost" onClick={() => setOnlyUnread((v) => !v)}>
          {onlyUnread ? 'Show all' : `Unread only (${unread})`}
        </button>
      }
    >
      {state === 'loading' && <p className="adm__note">Loading messages…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load messages. <button type="button" onClick={load}>Retry</button>
        </p>
      )}
      {state === 'ready' && shown.length === 0 && <p className="adm__note">{onlyUnread ? 'No unread messages.' : 'No messages yet.'}</p>}

      {state === 'ready' && shown.length > 0 && (
        <ul className="adm__list">
          {shown.map((m) => (
            <li key={m._id} className={`adm__card ${m.read ? '' : 'is-unread'}`}>
              <div className="adm__cardtop">
                <div>
                  <strong>
                    {m.name} {!m.read && <span className="adm__badge adm__badge--processing">New</span>}
                  </strong>
                  <span className="adm__meta">
                    {m.email} · {m.subject}
                  </span>
                </div>
                <span className="adm__meta">
                  {new Date(m.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="adm__body">{m.message}</p>
              <div className="adm__foot">
                <span>
                  <a className="adm__btn" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} onClick={() => !m.read && setRead(m, true)}>
                    Reply by email
                  </a>
                  <button type="button" className="adm__btn adm__btn--ghost" onClick={() => setRead(m, !m.read)}>
                    {m.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </span>
                <button type="button" className="adm__btn adm__btn--danger" onClick={() => remove(m)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toast && <div className="adm__toast">{toast}</div>}
    </AdminShell>
  );
}
