'use client';

/**
 * Place at: frontend/src/components/RelatedProducts.js
 * "You may also like" row at the bottom of the product page.
 * Picks up to 4 other products from the same category; if the category has fewer, the newest products fill the gaps.
 *   GET /api/products?category=&limit=   ·   GET /api/products?sort=newest&limit=
 * Shows nothing while loading, on an error, or when there is nothing else to show — it is never worth a broken-looking page.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import Stars from '@/components/Stars';
import './styles/RelatedProducts.css';

const COUNT = 4;

const formatPKR = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 'Rs —';
  return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

async function fetchList(query, signal) {
  const res = await fetch(`${API_URL}/api/products?${query}`, { signal });
  if (!res.ok) throw new Error('failed');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function RelatedProducts({ productId, category }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setItems([]);

    (async () => {
      try {
        const pick = (list, taken) => list.filter((p) => p._id !== productId && !taken.some((t) => t._id === p._id));
        let chosen = [];
        if (category && category !== 'general') {
          chosen = pick(await fetchList(`category=${encodeURIComponent(category)}&sort=newest&limit=${COUNT + 1}`, signal), []).slice(0, COUNT);
        }
        if (chosen.length < COUNT) {
          const newest = await fetchList(`sort=newest&limit=${COUNT * 2}`, signal);
          chosen = [...chosen, ...pick(newest, chosen)].slice(0, COUNT);
        }
        if (!signal.aborted) setItems(chosen);
      } catch {
        /* silently show nothing */
      }
    })();

    return () => controller.abort();
  }, [productId, category]);

  if (items.length === 0) return null;

  return (
    <section className="aur-rel" aria-labelledby="aur-rel-title">
      <h2 id="aur-rel-title">You may also like</h2>
      <ul className="aur-rel__grid">
        {items.map((p) => (
          <li key={p._id}>
            <Link href={`/shop/${p._id}`} className="aur-rel__card">
              <span className="aur-rel__img">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc(p.image)} alt="" loading="lazy" />
                ) : null}
                {p.stock <= 0 && <span className="aur-rel__badge">Sold out</span>}
              </span>
              <span className="aur-rel__name">{p.name}</span>
              {p.ratingCount > 0 && <Stars value={p.ratingAverage} count={p.ratingCount} size={13} />}
              <span className="aur-rel__price">{formatPKR(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>

    </section>
  );
}
