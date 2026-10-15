'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · ADMIN · PRODUCTS  (no-login version)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/admin/products/page.js
 *
 *  Full CRUD against your Express routes:
 *   GET    /api/products?search=&page=&limit=   list (paged and searchable; totals come back in X-Total-Count / X-Total-Pages)
 *   POST   /api/products        create
 *   PUT    /api/products/:id    update
 *   DELETE /api/products/:id    delete
 *   POST   /api/upload          image upload
 *   PATCH  /api/products/bulk         change category / collections / price / stock of the ticked products
 *   POST   /api/products/bulk-delete  delete the ticked products
 *
 *  Admin only. The create / update / delete routes require a signed-in admin
 *  (protect + adminOnly on the backend, which is the real protection). This page
 *  also checks the role so non-admins see a message instead of a broken table.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import AdminNav from '@/components/AdminNav';
import { AdminPager, AdminSearchBox, ADMIN_PAGE_SIZES } from '@/components/AdminListTools';
import { COLLECTION_SLUGS } from '@/lib/collections';
import { imageSrc } from '@/lib/imageUrl';
import './admin-products.css';

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

const EMPTY_BULK = {
  category: '',
  addCollections: [],
  removeCollections: [],
  priceMode: 'none', // none | set | increase | decrease
  priceValue: '',
  stockMode: 'none', // none | set
  stockValue: '',
};
const BULK_CHUNK = 100; // the backend changes at most this many products per request

const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

const EMPTY_FORM = { name: '', description: '', price: '', gallery: [], category: 'general', stock: '', collections: [], variants: [] };

const formatPKR = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? `Rs ${value.toLocaleString('en-PK')}` : 'Rs —';
};

// Uploaded images are stored as "/uploads/xyz.jpg" (relative to the BACKEND), so they
// need the API URL in front. blob:/data: previews are left untouched.
const mediaSrc = (value) => (/^(blob:|data:)/i.test(value || '') ? value : imageSrc(value));

export default function AdminProductsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  // What the table is showing. Search and page live together so a new search (back to page 1) is one request.
  const [query, setQuery] = useState({ search: '', page: 1, limit: ADMIN_PAGE_SIZES[0] });
  const [info, setInfo] = useState({ total: 0, pages: 1 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  // Ticked products. The ticks stay while you change pages (so you can pick across pages) and are cleared by a new search.
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState(EMPTY_BULK);
  const [bulkError, setBulkError] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const latest = useRef(0); // only the newest request may update the screen

  const { search, page, limit } = query;

  // silent: refresh without blanking the table (after saving / deleting)
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setStatus('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/products?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        const list = Array.isArray(data) ? data : [];
        const total = Number(res.headers.get('X-Total-Count') ?? list.length);
        const pages = Number(res.headers.get('X-Total-Pages') ?? 1) || 1;
        // The last product on the last page was just deleted: step back to a page that exists
        if (list.length === 0 && page > 1 && pages < page) {
          setQuery((q) => ({ ...q, page: pages }));
          return;
        }
        setProducts(list);
        setInfo({ total, pages });
        setStatus('ready');
      } catch {
        if (mine === latest.current) setStatus('error');
      }
    },
    [page, limit, search]
  );

  useEffect(() => {
    load();
  }, [load]);

  const setSearch = useCallback((text) => {
    setQuery((q) => ({ ...q, search: text, page: 1 }));
    setSelected(new Set()); // ticks from another search could hide products you no longer see
  }, []);
  const setLimit = (n) => setQuery((q) => ({ ...q, limit: n, page: 1 }));
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 4000);
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
      // one ordered list in the form: the first photo is the cover, the rest are the extra gallery photos
      gallery: [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean),
      category: product.category || 'general',
      stock: product.stock ?? '',
      collections: Array.isArray(product.collections) ? product.collections : [],
      // _id is kept so bags and past orders still point at the same variant after an edit
      variants: Array.isArray(product.variants)
        ? product.variants.map((v) => ({ _id: v._id, size: v.size || '', color: v.color || '', stock: v.stock ?? 0 }))
        : [],
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

  const MAX_PHOTOS = 9; // 1 cover + 8 extra

  // Uploads the chosen files one after another and appends each finished one to the gallery
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // lets you pick the same file again after removing it
    if (files.length === 0) return;

    setUploadError('');
    setUploading(true);
    const room = MAX_PHOTOS - form.gallery.length;
    if (files.length > room) setUploadError(`A product can have at most ${MAX_PHOTOS} photos, so only the first ${Math.max(room, 0)} were added.`);

    try {
      for (const file of files.slice(0, Math.max(room, 0))) {
        const body = new FormData();
        body.append('image', file);
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', credentials: 'include', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${file.name}: ${data.message || 'Upload failed'}`);
        setForm((f) => ({ ...f, gallery: [...f.gallery, data.url] }));
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed — try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (i) => setForm((f) => ({ ...f, gallery: f.gallery.filter((_, n) => n !== i) }));
  const makeCover = (i) =>
    setForm((f) => ({ ...f, gallery: [f.gallery[i], ...f.gallery.filter((_, n) => n !== i)] }));
  const movePhoto = (i, dir) =>
    setForm((f) => {
      const j = i + dir;
      if (j < 1 || j >= f.gallery.length || i < 1) return f; // the cover stays first
      const g = [...f.gallery];
      [g[i], g[j]] = [g[j], g[i]];
      return { ...f, gallery: g };
    });

  // ── variants (sizes / colors with their own stock) ───────────────────────────
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { size: '', color: '', stock: 0 }] }));
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, n) => n !== i) }));
  const updateVariant = (i, key) => (e) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, n) => (n === i ? { ...v, [key]: e.target.value } : v)) }));
  const variantTotal = form.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0);

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    if (form.gallery.length === 0) return 'Please upload at least one product image.';
    if (uploading) return 'Wait for the photos to finish uploading.';
    if (form.price === '' || Number(form.price) < 0) return 'Enter a valid price in rupees.';
    const seen = new Set();
    for (const v of form.variants) {
      if (!v.size.trim() && !v.color.trim()) return 'Each variant needs a size or a color (or remove the empty row).';
      const n = Number(v.stock);
      if (v.stock === '' || !Number.isInteger(n) || n < 0) return 'Variant stock must be a whole number, 0 or more.';
      const key = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (seen.has(key)) return `Duplicate variant: ${[v.size.trim(), v.color.trim()].filter(Boolean).join(' / ')}.`;
      seen.add(key);
    }
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
      image: form.gallery[0],
      images: form.gallery.slice(1),
      category: form.category.trim() || 'general',
      stock: form.stock === '' ? 0 : Number(form.stock),
      collections: form.collections,
      // always sent, so removing every row clears the variants; the server sets `stock` to their total
      variants: form.variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        size: v.size.trim(),
        color: v.color.trim(),
        stock: Number(v.stock),
      })),
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
      load({ silent: true });
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
      setToast('Product deleted');
      load({ silent: true }); // totals and page contents shift up
    } catch {
      setToast('Could not delete — try again');
    } finally {
      setDeletingId(null);
    }
  };

  // ── ticking products + bulk actions ──────────────────────────────────────────
  const pageIds = products.map((p) => p._id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allOnPage ? next.delete(id) : next.add(id)));
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${plural(ids.length, 'product')}? This can't be undone.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    try {
      for (const part of chunk(ids, BULK_CHUNK)) {
        const res = await fetch(`${API_URL}/api/products/bulk-delete`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: part }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Delete failed');
        deleted += data.deleted || 0;
      }
      setToast(`${plural(deleted, 'product')} deleted`);
    } catch (err) {
      setToast(deleted > 0 ? `Deleted ${deleted}, then it stopped: ${err.message}` : err.message || 'Could not delete — try again');
    } finally {
      setSelected(new Set());
      setBulkDeleting(false);
      load({ silent: true });
    }
  };

  const openBulk = () => {
    setBulk(EMPTY_BULK);
    setBulkError('');
    setBulkOpen(true);
  };
  const closeBulk = () => {
    if (bulkSaving) return;
    setBulkOpen(false);
  };
  const updateBulk = (key) => (e) => setBulk((b) => ({ ...b, [key]: e.target.value }));

  // A collection can be added or removed, not both: ticking it in one list unticks it in the other
  const toggleBulkCollection = (kind, slug) =>
    setBulk((b) => {
      const other = kind === 'addCollections' ? 'removeCollections' : 'addCollections';
      const has = b[kind].includes(slug);
      return { ...b, [kind]: has ? b[kind].filter((x) => x !== slug) : [...b[kind], slug], [other]: b[other].filter((x) => x !== slug) };
    });

  // Turns the panel into the `changes` the backend expects, or says what is wrong with it
  const buildBulkChanges = () => {
    const changes = {};
    if (bulk.category.trim()) changes.category = bulk.category.trim();
    if (bulk.addCollections.length || bulk.removeCollections.length) {
      changes.collections = { add: bulk.addCollections, remove: bulk.removeCollections };
    }
    if (bulk.priceMode !== 'none') {
      const n = Number(bulk.priceValue);
      if (bulk.priceValue === '' || !Number.isFinite(n)) return { error: 'Enter the price change.' };
      if (bulk.priceMode === 'set' && n < 0) return { error: 'The price can’t be negative.' };
      if (bulk.priceMode === 'increase' && (n <= 0 || n > 1000)) return { error: 'An increase must be between 0 and 1000 percent.' };
      if (bulk.priceMode === 'decrease' && (n <= 0 || n >= 100)) return { error: 'A decrease must be more than 0 and less than 100 percent.' };
      changes.price = { mode: bulk.priceMode, value: n };
    }
    if (bulk.stockMode === 'set') {
      const n = Number(bulk.stockValue);
      if (bulk.stockValue === '' || !Number.isInteger(n) || n < 0) return { error: 'Stock must be a whole number, 0 or more.' };
      changes.stock = { mode: 'set', value: n };
    }
    if (Object.keys(changes).length === 0) return { error: 'Choose at least one change.' };
    return { changes };
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    const { changes, error } = buildBulkChanges();
    if (error) {
      setBulkError(error);
      return;
    }
    setBulkSaving(true);
    setBulkError('');
    const ids = [...selected];
    let updated = 0;
    let stockSkipped = 0;
    const failed = [];
    try {
      for (const part of chunk(ids, BULK_CHUNK)) {
        const res = await fetch(`${API_URL}/api/products/bulk`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: part, changes }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Update failed');
        updated += data.updated || 0;
        stockSkipped += (data.stockSkipped || []).length;
        failed.push(...(data.failed || []));
      }
      load({ silent: true });
      if (failed.length > 0) {
        // keep the panel open so the problem is readable; the ticks stay so you can fix those products and retry
        setBulkError(`Updated ${updated}. Could not update: ${failed.map((f) => `${f.name} (${f.message})`).join('; ')}`);
        return;
      }
      setBulkOpen(false);
      setSelected(new Set());
      setToast(
        `Updated ${plural(updated, 'product')}` +
          (stockSkipped > 0 ? ` · stock left as it was on ${stockSkipped} with sizes/colors (edit those one by one)` : '')
      );
    } catch (err2) {
      load({ silent: true });
      setBulkError(updated > 0 ? `Updated ${updated}, then it stopped: ${err2.message}` : err2.message || 'Something went wrong. Nothing was changed.');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-admin`}>
      {authLoading && <p className="aur-admin__note">Checking access…</p>}
      {!authLoading && !isAdmin && (
        <div className="aur-admin__head">
          <div>
            <p className="aur-admin__eyebrow">Aurelia · Admin</p>
            <h1>Admin access required</h1>
            <p className="aur-admin__note">
              {user ? 'Your account does not have admin access.' : 'Sign in on the admin login page to manage products.'}
            </p>
          </div>
          <div className="aur-admin__head-actions">
            <Link href="/admin/login" className="aur-admin__link">
              Admin sign in
            </Link>
            {user && (
              <Link href="/" className="aur-admin__link">
                Back to store
              </Link>
            )}
          </div>
        </div>
      )}
      {!authLoading && isAdmin && (
      <>
      <AdminNav />
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

      <div className="aur-admin__toolbar">
        <AdminSearchBox onSearch={setSearch} label="Search products" placeholder="Search products by name or description" />
        {products.length > 0 && (
          <button type="button" className="aur-admin__selectpage" onClick={togglePage}>
            {allOnPage ? 'Unselect this page' : 'Select this page'}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="aur-admin__bulkbar" role="region" aria-label="Bulk actions">
          <strong>{selected.size.toLocaleString()} selected</strong>
          <button type="button" onClick={openBulk} disabled={bulkDeleting}>
            Edit selected
          </button>
          <button type="button" className="is-danger" onClick={bulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? 'Deleting…' : 'Delete selected'}
          </button>
          <button type="button" onClick={clearSelection} disabled={bulkDeleting}>
            Clear
          </button>
        </div>
      )}

      {status === 'loading' && products.length === 0 && <p className="aur-admin__note">Loading products…</p>}
      {status === 'error' && (
        <p className="aur-admin__note is-error">
          Couldn&apos;t reach the backend at {API_URL}. Is it running?{' '}
          <button type="button" onClick={() => load()}>
            Retry
          </button>
        </p>
      )}
      {status === 'ready' && products.length === 0 && (
        <p className="aur-admin__note">{search ? `No products match “${search}”.` : 'No products yet — add your first one.'}</p>
      )}

      {status !== 'error' && products.length > 0 && (
        <div className={`aur-admin__table${status === 'loading' ? ' is-busy' : ''}`} aria-busy={status === 'loading'}>
          <div className="aur-admin__row aur-admin__row--head">
            <span className="aur-admin__check">
              <input
                type="checkbox"
                aria-label="Select all products on this page"
                checked={allOnPage}
                ref={(el) => {
                  if (el) el.indeterminate = someOnPage && !allOnPage;
                }}
                onChange={togglePage}
              />
            </span>
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span />
          </div>
          {products.map((p) => (
            <div className={`aur-admin__row${selected.has(p._id) ? ' is-selected' : ''}`} key={p._id}>
              <span className="aur-admin__check">
                <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p._id)} onChange={() => toggleOne(p._id)} />
              </span>
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
              <span className={Number(p.stock) <= 0 ? 'is-zero' : ''} title={p.variants?.length ? `${p.variants.length} variants` : undefined}>
                {p.stock ?? 0}
                {p.variants?.length ? <small> · {p.variants.length} var.</small> : null}
              </span>
              <span className="aur-admin__actions">
                <button type="button" onClick={() => openEdit(p)}>
                  Edit
                </button>
                <button type="button" className="is-danger" onClick={() => remove(p)} disabled={deletingId === p._id || bulkDeleting}>
                  {deletingId === p._id ? 'Deleting…' : 'Delete'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {status !== 'error' && (
        <AdminPager page={page} pages={info.pages} total={info.total} limit={limit} onPage={goPage} onLimit={setLimit} noun="products" disabled={status === 'loading'} />
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
              <input
                type="number"
                min="0"
                step="1"
                value={form.variants.length > 0 ? variantTotal : form.stock}
                onChange={updateField('stock')}
                placeholder="0"
                disabled={form.variants.length > 0}
                title={form.variants.length > 0 ? 'Total of the variants below' : undefined}
              />
            </label>
          </div>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">
              Sizes &amp; colors {form.variants.length > 0 && <>(stock above is the total of these)</>}
            </span>
            {form.variants.length > 0 && (
              <div className="aur-admin__variants">
                <div className="aur-admin__variant aur-admin__variant--head" aria-hidden="true">
                  <span>Size</span>
                  <span>Color</span>
                  <span>Stock</span>
                  <span />
                </div>
                {form.variants.map((v, i) => (
                  <div className="aur-admin__variant" key={v._id || `new-${i}`}>
                    <input type="text" aria-label="Size" value={v.size} onChange={updateVariant(i, 'size')} placeholder="M" maxLength={30} />
                    <input type="text" aria-label="Color" value={v.color} onChange={updateVariant(i, 'color')} placeholder="Black" maxLength={30} />
                    <input type="number" aria-label="Stock" min="0" step="1" value={v.stock} onChange={updateVariant(i, 'stock')} />
                    <button type="button" className="aur-admin__variant-x" onClick={() => removeVariant(i)} aria-label="Remove variant">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="aur-admin__variant-add" onClick={addVariant}>
              + Add {form.variants.length > 0 ? 'another ' : 'a '}size / color
            </button>
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
            <span className="aur-admin__field-label">
              Photos <small>(the first one is the cover; up to {MAX_PHOTOS})</small>
            </span>
            {form.gallery.length > 0 && (
              <ul className="aur-admin__gallery">
                {form.gallery.map((url, i) => (
                  <li key={url} className={i === 0 ? 'is-cover' : ''}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaSrc(url)} alt="" />
                    {i === 0 && <span className="aur-admin__cover-tag">Cover</span>}
                    <div className="aur-admin__gallery-tools">
                      {i > 0 && (
                        <>
                          <button type="button" onClick={() => makeCover(i)} disabled={uploading} title="Use as cover">
                            Cover
                          </button>
                          <button type="button" onClick={() => movePhoto(i, -1)} disabled={uploading || i < 2} aria-label="Move earlier">
                            ←
                          </button>
                          <button type="button" onClick={() => movePhoto(i, 1)} disabled={uploading || i === form.gallery.length - 1} aria-label="Move later">
                            →
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => removePhoto(i)} disabled={uploading} aria-label="Remove photo">
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {form.gallery.length < MAX_PHOTOS && (
              <label className="aur-admin__dropzone">
                <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={uploading} />
                {uploading ? 'Uploading…' : form.gallery.length === 0 ? 'Click to upload photos' : 'Add more photos'}
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

      <div className={`aur-admin__overlay ${bulkOpen ? 'is-open' : ''}`} onClick={closeBulk} />
      <aside className={`aur-admin__panel ${bulkOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Edit selected products">
        <form onSubmit={submitBulk}>
          <h2>Edit {plural(selected.size, 'product')}</h2>
          <p className="aur-admin__hint">Only the things you fill in are changed. Everything else on these products stays as it is.</p>

          <label>
            Category
            <input type="text" value={bulk.category} onChange={updateBulk('category')} placeholder="Leave empty to keep each category" maxLength={60} />
          </label>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Add to collections</span>
            <div className="aur-admin__collections">
              {COLLECTION_SLUGS.map((c) => (
                <label key={c.slug} className="aur-admin__chip">
                  <input type="checkbox" checked={bulk.addCollections.includes(c.slug)} onChange={() => toggleBulkCollection('addCollections', c.slug)} />
                  {c.title}
                </label>
              ))}
            </div>
          </div>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Remove from collections</span>
            <div className="aur-admin__collections">
              {COLLECTION_SLUGS.map((c) => (
                <label key={c.slug} className="aur-admin__chip">
                  <input type="checkbox" checked={bulk.removeCollections.includes(c.slug)} onChange={() => toggleBulkCollection('removeCollections', c.slug)} />
                  {c.title}
                </label>
              ))}
            </div>
          </div>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Price</span>
            <div className="aur-admin__grid2">
              <select value={bulk.priceMode} onChange={updateBulk('priceMode')} aria-label="Price change">
                <option value="none">Keep prices</option>
                <option value="set">Set price to (Rs)</option>
                <option value="increase">Increase by (%)</option>
                <option value="decrease">Decrease by (%)</option>
              </select>
              <input
                type="number"
                min="0"
                step="any"
                value={bulk.priceValue}
                onChange={updateBulk('priceValue')}
                disabled={bulk.priceMode === 'none'}
                placeholder={bulk.priceMode === 'set' ? '5999' : '10'}
                aria-label="Price value"
              />
            </div>
            {(bulk.priceMode === 'increase' || bulk.priceMode === 'decrease') && <small className="aur-admin__hint">Rounded to whole rupees.</small>}
          </div>

          <div className="aur-admin__field">
            <span className="aur-admin__field-label">Stock</span>
            <div className="aur-admin__grid2">
              <select value={bulk.stockMode} onChange={updateBulk('stockMode')} aria-label="Stock change">
                <option value="none">Keep stock</option>
                <option value="set">Set stock to</option>
              </select>
              <input
                type="number"
                min="0"
                step="1"
                value={bulk.stockValue}
                onChange={updateBulk('stockValue')}
                disabled={bulk.stockMode === 'none'}
                placeholder="0"
                aria-label="Stock value"
              />
            </div>
            {bulk.stockMode === 'set' && <small className="aur-admin__hint">Products with sizes / colors keep their own per-size stock; edit those one by one.</small>}
          </div>

          {bulkError && <p className="aur-admin__error">{bulkError}</p>}

          <div className="aur-admin__panel-actions">
            <button type="button" onClick={closeBulk} disabled={bulkSaving}>
              Cancel
            </button>
            <button type="submit" className="aur-admin__save" disabled={bulkSaving || selected.size === 0}>
              {bulkSaving ? 'Saving…' : `Apply to ${plural(selected.size, 'product')}`}
            </button>
          </div>
        </form>
      </aside>
      </>
      )}

    </main>
  );
}