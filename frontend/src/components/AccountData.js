'use client';

/**
 * Place at: frontend/src/components/AccountData.js
 *
 * "Your data" section of the account page: download everything the store holds about you,
 * and delete your account. Rendered inside <main className="acc-details"> so it reuses that page's colours.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/imageUrl';
import './styles/AccountData.css';

const CONFIRM_WORD = 'DELETE';

export default function AccountData() {
    const router = useRouter();
    const { refresh } = useAuth();

    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const downloadData = async () => {
        setExportError('');
        setExporting(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/me/export`, { credentials: 'include' });
            if (!res.ok) {
                let message = 'Could not prepare your data. Please try again.';
                try {
                    message = (await res.json()).message || message;
                } catch {
                    /* keep the default message */
                }
                throw new Error(res.status === 429 ? 'Too many downloads. Please try again later.' : message);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `aurelia-my-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setExportError(err.message);
        } finally {
            setExporting(false);
        }
    };

    const deleteAccount = async (e) => {
        e.preventDefault();
        setDeleteError('');
        setDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            let data = {};
            try {
                data = await res.json();
            } catch {
                /* no body */
            }
            if (!res.ok) throw new Error(data.message || 'Could not delete your account. Please try again.');
            await refresh(); // the cookie is gone, so this signs the page out
            router.replace('/');
        } catch (err) {
            setDeleteError(err.message);
            setDeleting(false);
        }
    };

    const closeDelete = () => {
        setOpen(false);
        setPassword('');
        setConfirmText('');
        setDeleteError('');
    };

    return (
        <section className="acc-data" aria-labelledby="acc-data-title">
            <h2 id="acc-data-title">Your data</h2>

            <div className="acc-data__block">
                <h3>Download your data</h3>
                <p>Get a file with your details, addresses, orders, reviews and messages.</p>
                <button type="button" className="acc-data__btn" onClick={downloadData} disabled={exporting}>
                    {exporting ? 'Preparing…' : 'Download my data'}
                </button>
                {exportError && <p className="acc-data__msg acc-data__msg--error" role="alert">{exportError}</p>}
            </div>

            <div className="acc-data__block acc-data__block--danger">
                <h3>Delete your account</h3>
                <p>
                    This permanently removes your account, saved addresses, reviews and newsletter subscription. Past
                    orders are kept without your name, address or contact details, because we need them for our
                    accounting records. This can&apos;t be undone.
                </p>

                {!open ? (
                    <button type="button" className="acc-data__btn acc-data__btn--danger" onClick={() => setOpen(true)}>
                        Delete my account
                    </button>
                ) : (
                    <form className="acc-data__form" onSubmit={deleteAccount}>
                        <label>
                            Your password
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </label>
                        <label>
                            Type {CONFIRM_WORD} to confirm
                            <input
                                type="text"
                                required
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                autoComplete="off"
                            />
                        </label>

                        {deleteError && <p className="acc-data__msg acc-data__msg--error" role="alert">{deleteError}</p>}

                        <div className="acc-data__actions">
                            <button
                                type="submit"
                                className="acc-data__btn acc-data__btn--danger"
                                disabled={deleting || !password || confirmText !== CONFIRM_WORD}
                            >
                                {deleting ? 'Deleting…' : 'Permanently delete'}
                            </button>
                            <button type="button" className="acc-data__btn" onClick={closeDelete} disabled={deleting}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
