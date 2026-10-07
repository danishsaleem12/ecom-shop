'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · ADMIN · PRODUCTS  (no-login version)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/admin/products/page.js
 *
 *  Full CRUD against your Express routes:
 *   GET    /api/products        list
 *   POST   /api/products        create
 *   PUT    /api/products/:id    update
 *   DELETE /api/products/:id    delete
 *   POST   /api/upload          image upload
 *
 *  No auth gate: /admin/products opens directly. Make sure the matching Express
 *  routes no longer require admin middleware, or writes will return 401/403.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { COLLECTION_SLUGS } from '@/lib/collections';
import { imageSrc } from '@/lib/imageUrl';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--aur-serif',
  display: 'swap',
});
const sans = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--aur-sans',
  display: 'swap',
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const EMPTY_FORM = { name: '', description: '', price: '', image: '', category: 'general', stock: '', collections: [] };

const formatPKR = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? `Rs ${value.toLocaleString('en-PK')}` : 'Rs —';
};

// Uploaded images are stored as "/uploads/xyz.jpg" (relative to the BACKEND), so they
// need the API URL in front. blob:/data: previews are left untouched.
const mediaSrc = (value) => (/^(blob:|data:)/i.test(value || '') ? value : imageSrc(value));

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const load = useCallback(() => {
    setStatus('loading');
    fetch(`${API_URL}/api/products`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setUploadError('');
    setPanelOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      image: product.image || '',
      category: product.category || 'general',
      stock: product.stock ?? '',
      collections: Array.isArray(product.collections) ? product.collections : [],
    });
    setFormError('');
    setUploadError('');
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (saving) return;
    setPanelOpen(false);
  };

  const updateField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleCollection = (slug) => {
    setForm((f) => {
      const has = f.collections.includes(slug);
      return { ...f, collections: has ? f.collections.filter((s) => s !== slug) : [...f.collections, slug] };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadError('');
    const localPreview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, image: localPreview }));
    setUploading(true);

    try {
      const body = new FormData();
      body.append('image', file);
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', credentials: 'include', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setForm((f) => ({ ...f, image: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed — try again.');
      setForm((f) => ({ ...f, image: '' }));
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      e.target.value = ''; // lets you pick the same file again after removing it
    }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.image.trim()) return 'Please upload a product image.';
    if (form.price === '' || Number(form.price) < 0) return 'Enter a valid price in rupees.';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image: form.image.trim(),
      category: form.category.trim() || 'general',
      stock: form.stock === '' ? 0 : Number(form.stock),
      collections: form.collections,
    };

    try {
      const url = editingId ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Save failed');

      setPanelOpen(false);
      setToast(editingId ? 'Product updated' : 'Product added');
      load();
    } catch (err2) {
      setFormError(err2.message || 'Something went wrong saving this product.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    setDeletingId(product._id);
    try {
      const res = await fetch(`${API_URL}/api/products/${product._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setProducts((list) => list.filter((p) => p._id !== product._id));
      setToast('Product deleted');
    } catch {
      setToast('Could not delete — try again');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-admin`}>
      <div className="aur-admin__head">
        <div>
          <p className="aur-admin__eyebrow">Aurelia · Admin</p>
          <h1>Products</h1>
        </div>
        <div className="aur-admin__head-actions">
          <Link href="/" className="aur-admin__link">
            View store
          </Link>
          <button type="button" className="aur-admin__addbtn" onClick={openCreate}>
            + Add product
          </button>
        </div>
      </div>

      {status === 'loading' && <p className="aur-admin__note">Loading products…</p>}
      {status === 'error' && (
        <p className="aur-admin__note is-error">
          Couldn&apos;t reach the backend at {API_URL}. Is it running?{' '}
          <button type="button" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {status === 'ready' && products.length === 0 && <p className="aur-admin__note">No products yet — add your first one.</p>}

      {status === 'ready' && products.length > 0 && (
        <div className="aur-admin__table">
          <div className="aur-admin__row aur-admin__row--head">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span />
          </div>
          {products.map((p) => (
            <div className="aur-admin__row" key={p._id}>
              <span className="aur-admin__product">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(p.image)} alt="" />
                ) : (
                  <span className="aur-admin__thumb-empty" />
                )}
                <span className="aur-admin__product-name">{p.name}</span>
              </span>
              <span>{p.category || 'general'}</span>
              <span>{formatPKR(p.price)}</span>
              <span className={Number(p.stock) <= 0 ? 'is-zero' : ''}>{p.stock ?? 0}</span>
              <span className="aur-admin__actions">
                <button type="button" onClick={() => openEdit(p)}>
                  Edit
                </button>
                <button type="button" className="is-danger" onClick={() => remove(p)} disabled={deletingId === p._id}>
                  {deletingId === p._id ? 'Deleting…' : 'Delete'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="aur-admin__toast">{toast}</div>}

      <div className={`aur-admin__overlay ${panelOpen ? 'is-open' : ''}`} onClick={closePanel} />
      <aside className={`aur-admin__panel ${panelOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label={editingId ? 'Edit product' : 'Add product'}>
        <form onSubmit={submit}>
          <h2>{editingId ? 'Edit product' : 'Add product'}</h2>

          <label>
            Name
            <input type="text" value={form.name} onChange={updateField('name')} placeholder="Everyday Sneakers" />
          </label>

          <label>
            Description
            <textarea rows={3} value={form.description} onChange={updateField('description')} placeholder="A short, honest description of the piece." />
          </label>

          <div className="aur-admin__grid2">
            <label>
              Price (PKR)
              <input type="number" min="0" step="1" value={form.price} onChange={updateField('price')} placeholder="5999" />
            </label>
            <label>
              Stock
              <input type="number" min="0" step="1" value={form.stock} onChange={updateField('stock')} placeholder="0" />
            </label>
          </div>

          <label>
            Category
            <input type="text" value={form.category} onChange={updateField('category')} placeholder="footwear" />
          </label>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Collections</span>
            <div className="aur-admin__collections">
              {COLLECTION_SLUGS.map((c) => (
                <label key={c.slug} className="aur-admin__chip">
                  <input type="checkbox" checked={form.collections.includes(c.slug)} onChange={() => toggleCollection(c.slug)} />
                  {c.title}
                </label>
              ))}
            </div>
          </div>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Image</span>
            {form.image ? (
              <div className="aur-admin__upload-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(form.image)} alt="" />
                {uploading && <span className="aur-admin__upload-overlay">Uploading…</span>}
                <button
                  type="button"
                  className="aur-admin__upload-remove"
                  onClick={() => setForm((f) => ({ ...f, image: '' }))}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="aur-admin__dropzone">
                <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                {uploading ? 'Uploading…' : 'Click to upload an image'}
              </label>
            )}
            {uploadError && <p className="aur-admin__error">{uploadError}</p>}
          </div>

          {formError && <p className="aur-admin__error">{formError}</p>}

          <div className="aur-admin__panel-actions">
            <button type="button" onClick={closePanel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="aur-admin__save" disabled={saving || uploading}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </aside>

      <style jsx global>{`
        .aur-admin {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          min-height: 100vh;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: 56px clamp(20px, 4vw, 64px) 80px;
        }
        .aur-admin__head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 36px;
        }
        .aur-admin__head-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
        }
        .aur-admin__link {
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(24, 21, 19, 0.65);
          font: inherit;
          font-size: 0.86rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .aur-admin__link:hover {
          color: var(--ink);
        }
        .aur-admin__eyebrow {
          margin: 0 0 6px;
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .aur-admin__head h1 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.2rem;
        }
        .aur-admin__addbtn {
          height: 46px;
          padding: 0 22px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .aur-admin__note {
          color: rgba(24, 21, 19, 0.6);
        }
        .aur-admin__note.is-error {
          color: #a44b3f;
        }
        .aur-admin__note button {
          border: 0;
          background: transparent;
          text-decoration: underline;
          cursor: pointer;
          color: inherit;
          font: inherit;
        }

        .aur-admin__table {
          border-top: 1px solid var(--line);
        }
        .aur-admin__row {
          display: grid;
          grid-template-columns: minmax(0, 2fr) 1fr 1fr 0.6fr auto;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          font-size: 0.92rem;
        }
        .aur-admin__row--head {
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .aur-admin__product {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .aur-admin__product img,
        .aur-admin__thumb-empty {
          width: 42px;
          height: 42px;
          border-radius: 6px;
          object-fit: cover;
          background: #e4d9cd;
          flex-shrink: 0;
        }
        .aur-admin__product-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .is-zero {
          color: #a44b3f;
        }
        .aur-admin__actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .aur-admin__actions button {
          border: 0;
          background: transparent;
          color: rgba(24, 21, 19, 0.65);
          font: inherit;
          font-size: 0.86rem;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .aur-admin__actions button:hover {
          color: var(--ink);
        }
        .aur-admin__actions .is-danger {
          color: #a44b3f;
        }

        .aur-admin__toast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          transform: translateX(-50%);
          padding: 12px 22px;
          border-radius: 999px;
          background: var(--ink);
          color: var(--cream);
          font-size: 0.88rem;
          z-index: 60;
        }

        .aur-admin__overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(24, 21, 19, 0.4);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0s linear 0.3s;
        }
        .aur-admin__overlay.is-open {
          opacity: 1;
          visibility: visible;
          transition-delay: 0s;
        }
        .aur-admin__panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          width: min(420px, 100%);
          overflow-y: auto;
          background: var(--cream);
          border-left: 1px solid var(--line);
          box-shadow: -30px 0 60px -20px rgba(0, 0, 0, 0.25);
          transform: translate3d(100%, 0, 0);
          transition: transform 0.5s cubic-bezier(0.22, 0.8, 0.2, 1);
        }
        .aur-admin__panel.is-open {
          transform: none;
        }
        .aur-admin__panel form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 32px 28px 40px;
        }
        .aur-admin__panel h2 {
          margin: 0 0 4px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.6rem;
        }
        .aur-admin__panel label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-admin__panel input,
        .aur-admin__panel textarea {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-size: 0.92rem;
          resize: vertical;
        }
        .aur-admin__panel input:focus,
        .aur-admin__panel textarea:focus {
          outline: 2px solid var(--copper);
          outline-offset: 1px;
        }
        .aur-admin__grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .aur-admin__collections {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .aur-admin__chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          font-size: 0.8rem;
          color: rgba(24, 21, 19, 0.75);
          cursor: pointer;
          user-select: none;
        }
        .aur-admin__chip:has(input:checked) {
          border-color: var(--copper);
          background: rgba(201, 138, 99, 0.12);
          color: var(--ink);
        }
        .aur-admin__chip input {
          width: 13px;
          height: 13px;
          accent-color: var(--copper);
        }
        .aur-admin__field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .aur-admin__field-label {
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-admin__dropzone {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 120px;
          border: 1px dashed rgba(24, 21, 19, 0.32);
          border-radius: 8px;
          color: rgba(24, 21, 19, 0.55);
          font-size: 0.88rem;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .aur-admin__dropzone:hover {
          border-color: var(--copper);
          background: rgba(201, 138, 99, 0.06);
        }
        .aur-admin__dropzone input {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          opacity: 0;
        }
        .aur-admin__upload-preview {
          position: relative;
          height: 160px;
          border-radius: 8px;
          overflow: hidden;
        }
        .aur-admin__upload-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .aur-admin__upload-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(24, 21, 19, 0.55);
          color: var(--cream);
          font-size: 0.85rem;
        }
        .aur-admin__upload-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 5px 12px;
          border: 0;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.75);
          color: var(--cream);
          font: inherit;
          font-size: 0.76rem;
          cursor: pointer;
        }
        .aur-admin__upload-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .aur-admin__error {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(164, 75, 63, 0.12);
          color: #a44b3f;
          font-size: 0.85rem;
        }
        .aur-admin__panel-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .aur-admin__panel-actions button {
          flex: 1;
          height: 46px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .aur-admin__panel-actions button[type='button'] {
          border: 1px solid rgba(24, 21, 19, 0.26);
          background: transparent;
          color: var(--ink);
        }
        .aur-admin__save {
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
        }
        .aur-admin__save:disabled,
        .aur-admin__panel-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 720px) {
          .aur-admin__row {
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-areas: 'product actions' 'meta meta';
          }
          .aur-admin__row--head {
            display: none;
          }
          .aur-admin__product {
            grid-area: product;
          }
          .aur-admin__actions {
            grid-area: actions;
          }
          .aur-admin__row > span:nth-child(2),
          .aur-admin__row > span:nth-child(3),
          .aur-admin__row > span:nth-child(4) {
            grid-area: meta;
            display: inline;
            margin-right: 12px;
            font-size: 0.82rem;
            color: rgba(24, 21, 19, 0.6);
          }
        }
      `}</style>
    </main>
  );
}