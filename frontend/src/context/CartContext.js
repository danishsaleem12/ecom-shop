'use client';

/**
 * Place at: frontend/src/context/CartContext.js
 *
 * Usage:
 *   layout.js        → <CartProvider>{children}</CartProvider>
 *   any client comp  → const { items, addItem, count, subtotal } = useCart();
 *
 * Cart is persisted in localStorage under "aurelia-cart".
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'aurelia-cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Load saved cart once on the client (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setItems(saved);
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

  // product: { _id, name, price, image, stock? }
  const addItem = useCallback((product, qty = 1) => {
    const id = product._id || product.id;
    if (!id) return;
    setItems((list) => {
      const existing = list.find((i) => i.id === id);
      const max = product.stock > 0 ? product.stock : Infinity;
      if (existing) {
        return list.map((i) => (i.id === id ? { ...i, qty: Math.min(i.qty + qty, max) } : i));
      }
      return [
        ...list,
        { id, name: product.name, price: product.price, image: product.image, stock: product.stock, qty: Math.min(qty, max) },
      ];
    });
  }, []);

  const updateQty = useCallback((id, qty) => {
    setItems((list) =>
      list
        .map((i) => (i.id === id ? { ...i, qty: Math.min(Math.max(0, qty), i.stock > 0 ? i.stock : Infinity) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const removeItem = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      updateQty,
      removeItem,
      clear,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * Number(i.price || 0), 0),
    }),
    [items, hydrated, addItem, updateQty, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}