'use client';

/**
 * Place at: frontend/src/context/CartContext.js
 *
 * Usage:
 *   layout.js        → <CartProvider>{children}</CartProvider>
 *   any client comp  → const { items, addItem, count, subtotal } = useCart();
 *
 * Cart is persisted in localStorage under "aurelia-cart".
 *
 * Signed-in customers also have it saved on their account (/api/cart), so it follows them across devices:
 *   - right after signing in, this browser's bag is merged with the saved one (the bigger quantity wins);
 *   - every change is saved a moment later;
 *   - coming back to the tab fetches the latest from the account;
 *   - signing out empties the bag on this device (it stays on the account).
 * Guests keep using localStorage only. If the server can't be reached the bag still works locally.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/imageUrl';

const STORAGE_KEY = 'aurelia-cart';
const CartContext = createContext(null);

/** True for a product that is sold in sizes/colors (the buyer must pick one before it can go in the bag). */
export const hasVariants = (product) => Array.isArray(product?.variants) && product.variants.length > 0;

/** "M / Black" */
export const variantLabel = (v) => [v?.size, v?.color].filter(Boolean).join(' / ');

// Each bag line is identified by `key`: the product id, plus the variant id when it has one,
// so the same shirt in two sizes is two lines.
const lineKey = (productId, variantId) => (variantId ? `${productId}:${variantId}` : String(productId));

const SAVE_DELAY_MS = 700; // wait for the shopper to stop clicking before saving to the account

// The bag as the server stores it: only ids and quantities
const toServer = (list) => ({
  items: list.map((i) => ({ product: i.id, ...(i.variantId ? { variant: i.variantId } : {}), qty: i.qty })),
});

// Server lines -> bag lines
const fromServer = (list) => (Array.isArray(list) ? list.map((i) => ({ ...i, key: i.key || lineKey(i.id, i.variantId) })) : []);

const jsonInit = (method, body) => ({
  method,
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function CartProvider({ children }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  const itemsRef = useRef(items); // latest bag, readable inside async code without re-running effects
  const accountReady = useRef(false); // true once this sign-in's bag has been merged with the account's
  const lastSynced = useRef(''); // what the account is known to hold (as JSON), so we only save real changes
  const pending = useRef(false); // a change is waiting to be saved
  const wasSignedIn = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Load saved cart once on the client (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // bags saved before variants existed have no `key` — their key is simply the product id
      if (Array.isArray(saved)) setItems(saved.map((i) => ({ ...i, key: i.key || lineKey(i.id, i.variantId) })));
    } catch {
      /* ignore corrupt data */
    }
    setHydrated(true);
  }, []);

  // Save on change (only after the initial load, so we don't overwrite it with [])
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / blocked */
    }
  }, [items, hydrated]);

  // Merge this browser's bag into the account's right after signing in (and retry later if the server was unreachable)
  const mergeWithAccount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cart/merge`, jsonInit('POST', toServer(itemsRef.current)));
      if (!res.ok) return;
      const data = await res.json();
      const merged = fromServer(data.items);
      lastSynced.current = JSON.stringify(toServer(merged));
      accountReady.current = true;
      setItems(merged);
    } catch {
      /* offline: keep working locally, we retry when the tab is shown again */
    }
  }, []);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!userId) {
      accountReady.current = false;
      lastSynced.current = '';
      // Signed out (not just a guest who never signed in): don't leave the account's bag on this device
      if (wasSignedIn.current) {
        wasSignedIn.current = false;
        setItems([]);
      }
      return;
    }
    wasSignedIn.current = true;
    accountReady.current = false;
    mergeWithAccount();
  }, [hydrated, authLoading, userId, mergeWithAccount]);

  // Save changes to the account shortly after they happen
  useEffect(() => {
    if (!hydrated || !userId || !accountReady.current) return undefined;
    const body = JSON.stringify(toServer(items));
    if (body === lastSynced.current) {
      pending.current = false;
      return undefined;
    }
    pending.current = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/cart`, { ...jsonInit('PUT'), body });
        if (res.ok) lastSynced.current = body;
      } catch {
        /* the next change (or the next visit) saves it */
      } finally {
        pending.current = false;
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [items, hydrated, userId]);

  // Coming back to this tab: pick up changes made on another device (unless we have unsaved changes of our own)
  useEffect(() => {
    if (!userId) return undefined;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || pending.current) return;
      if (!accountReady.current) {
        await mergeWithAccount();
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/cart`, { credentials: 'include' });
        if (!res.ok || pending.current) return;
        const latest = fromServer((await res.json()).items);
        const body = JSON.stringify(toServer(latest));
        if (body === JSON.stringify(toServer(itemsRef.current))) return;
        lastSynced.current = body;
        setItems(latest);
      } catch {
        /* keep what we have */
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, mergeWithAccount]);

  // product: { _id, name, price, image, stock?, variants? }, variant: one entry of product.variants.
  // A product that has variants can't be added without one: the shopper is sent to its page to choose,
  // and this returns false so the caller can skip its "Added" animation. Returns true when added.
  const addItem = useCallback(
    (product, qty = 1, variant = null) => {
      const id = product._id || product.id;
      if (!id) return false;
      if (hasVariants(product) && !variant) {
        router.push(`/shop/${id}`);
        return false;
      }
      const variantId = variant ? String(variant._id || variant.id) : undefined;
      const key = lineKey(id, variantId);
      const stock = variant ? variant.stock : product.stock;
      const max = stock > 0 ? stock : Infinity;
      setItems((list) => {
        const existing = list.find((i) => i.key === key);
        if (existing) {
          return list.map((i) => (i.key === key ? { ...i, stock, qty: Math.min(i.qty + qty, max) } : i));
        }
        return [
          ...list,
          {
            key,
            id,
            variantId,
            size: variant?.size || undefined,
            color: variant?.color || undefined,
            name: product.name,
            price: product.price,
            image: product.image,
            stock,
            qty: Math.min(qty, max),
          },
        ];
      });
      return true;
    },
    [router]
  );

  const updateQty = useCallback((key, qty) => {
    setItems((list) =>
      list
        .map((i) => (i.key === key ? { ...i, qty: Math.min(Math.max(0, qty), i.stock > 0 ? i.stock : Infinity) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const removeItem = useCallback((key) => setItems((list) => list.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  // After the server rejects a checkout it sends back the current truth:
  // [{ id, name, price, image, stock, variants: [{ id, size, color, stock }] }]. Refresh price/stock from it
  // (a variant line uses its variant's stock), trim quantities to what's available, and drop lines that
  // were deleted, sold out, or whose variant is gone.
  const syncItems = useCallback((current) => {
    const byId = new Map((current || []).map((p) => [String(p.id), p]));
    setItems((list) =>
      list
        .map((i) => {
          const p = byId.get(String(i.id));
          if (!p) return null;
          const variants = p.variants || [];
          let stock = p.stock;
          let size = i.size;
          let color = i.color;
          if (variants.length > 0) {
            const v = i.variantId ? variants.find((x) => String(x.id) === String(i.variantId)) : null;
            if (!v) return null; // option removed, or the line was added before this product had options
            stock = v.stock;
            size = v.size || undefined;
            color = v.color || undefined;
          } else if (i.variantId) {
            return null; // the product no longer has options
          }
          if (!(stock > 0)) return null;
          return { ...i, name: p.name, price: p.price, image: p.image, stock, size, color, qty: Math.min(i.qty, stock) };
        })
        .filter(Boolean)
    );
  }, []);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      updateQty,
      removeItem,
      clear,
      syncItems,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * Number(i.price || 0), 0),
    }),
    [items, hydrated, addItem, updateQty, removeItem, clear, syncItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}