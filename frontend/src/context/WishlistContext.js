'use client';

/**
 * Place at: frontend/src/context/WishlistContext.js
 *
 * Deliberately mirrors CartContext.js's shape and pattern, so the two
 * read the same way everywhere they're used. Wishlist only remembers
 * WHICH product IDs were liked — it has no backend of its own, so full
 * product data (name/price/image) is fetched fresh whenever it's needed,
 * via GET /api/products?ids=... (see the updated products.routes.js).
 *
 * Uses the SAME localStorage key ("aurelia-wishlist") the Shop page's
 * old standalone hook already used, so anything already liked there
 * carries over automatically — nobody's wishlist gets reset by this.
 *
 * Usage:
 *   layout.js        → <WishlistProvider>{children}</WishlistProvider>
 *   any client comp  → const { ids, toggle, has, count } = useWishlist();
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'aurelia-wishlist';
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Load saved wishlist once on the client (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setIds(saved);
    } catch {
      /* ignore corrupt data */
    }
    setHydrated(true);
    hydratedRef.current = true;
  }, []);

  // Save on change (only after the initial load, so we don't overwrite it with [])
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage full / blocked */
    }
  }, [ids]);

  const add = useCallback((id) => {
    setIds((list) => (list.includes(id) ? list : [...list, id]));
  }, []);

  const remove = useCallback((id) => {
    setIds((list) => list.filter((x) => x !== id));
  }, []);

  const toggle = useCallback((id) => {
    setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({ ids, hydrated, add, remove, toggle, has, clear, count: ids.length }),
    [ids, hydrated, add, remove, toggle, has, clear]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}