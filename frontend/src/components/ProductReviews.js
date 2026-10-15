'use client';

/**
 * Place at: frontend/src/components/ProductReviews.js
 * The reviews block at the bottom of the product page: rating summary, the list, and the write / edit form.
 *   GET    /api/reviews/product/:id          public list + summary
 *   GET    /api/reviews/product/:id/mine     the signed-in customer's own review + whether they may write one
 *   POST   /api/reviews/product/:id          write
 *   PUT    /api/reviews/:id                  edit        DELETE /api/reviews/:id   delete
 *
 * Props: productId, onSummary({ average, count }) — lets the page header update its stars after a change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/imageUrl';
import Stars from '@/components/Stars';
import './styles/ProductReviews.css';

const PAGE = 5;
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const formatDate = (d) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** Five radio buttons drawn as stars (arrow keys work natively on a radio group). */
function RatingInput({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="aur-rev__pick">
      <fieldset className="aur-rev__stars" onMouseLeave={() => setHover(0)} disabled={disabled}>
        <legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} onMouseEnter={() => setHover(n)} className={n <= shown ? 'is-on' : ''}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} />
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.5l2.94 6.1 6.66.9-4.88 4.64 1.22 6.62L12 17.5l-5.94 3.26 1.22-6.62L2.4 9.5l6.66-.9L12 2.5z" />
            </svg>
            <span className="aur-rev__sr">
              {n} {n === 1 ? 'star' : 'stars'} — {RATING_WORDS[n]}
            </span>
          </label>
        ))}
      </fieldset>
      <span className="aur-rev__word" aria-live="polite">
        {shown ? RATING_WORDS[shown] : 'Tap a star'}
      </span>
    </div>
  );
}

export default function ProductReviews({ productId, onSummary }) {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviews, setReviews] = useState([]);
  const [info, setInfo] = useState({ page: 1, pages: 1 });
  const [sort, setSort] = useState('newest');
  const [state, setState] = useState('loading'); // loading | ready | error
  const [more, setMore] = useState(false);
  const [mine, setMine] = useState(null); // answer of /mine, or null (signed out / not loaded)

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const formRef = useRef(null);
  const latest = useRef(0); // only the newest list request may update the screen
  const onSummaryRef = useRef(onSummary);
  useEffect(() => {
    onSummaryRef.current = onSummary;
  }, [onSummary]);

  const loadList = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const req = ++latest.current;
      if (append) setMore(true);
      else setState((s) => (s === 'ready' ? s : 'loading'));
      try {
        const res = await fetch(`${API_URL}/api/reviews/product/${productId}?sort=${sort}&page=${page}&limit=${PAGE}`);
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (req !== latest.current) return;
        setSummary(data.summary);
        setInfo({ page: data.page, pages: data.pages });
        setReviews((list) => (append ? [...list, ...data.reviews.filter((r) => !list.some((x) => x._id === r._id))] : data.reviews));
        setState('ready');
        onSummaryRef.current?.({ average: data.summary.average, count: data.summary.count });
      } catch {
        if (req === latest.current && !append) setState('error');
        if (append) setToast('Could not load more reviews');
      } finally {
        if (append) setMore(false);
      }
    },
    [productId, sort]
  );

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/product/${productId}/mine`, { credentials: 'include' });
      setMine(res.ok ? await res.json() : null);
    } catch {
      setMine(null);
    }
  }, [productId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (authLoading) return;
    if (user) loadMine();
    else setMine(null);
  }, [authLoading, user, loadMine]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const openForm = (existing) => {
    setRating(existing?.rating || 0);
    setTitle(existing?.title || '');
    setComment(existing?.comment || '');
    setError('');
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!rating) {
      setError('Please choose a star rating.');
      return;
    }
    setSaving(true);
    setError('');
    const editing = Boolean(mine?.review);
    try {
      const res = await fetch(editing ? `${API_URL}/api/reviews/${mine.review._id}` : `${API_URL}/api/reviews/product/${productId}`, {
        method: editing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, comment }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || 'Could not save your review');
      setFormOpen(false);
      setToast(editing ? 'Review updated' : 'Thank you for your review!');
      await Promise.all([loadList(), loadMine()]);
    } catch (err) {
      setError(err.message || 'Could not save your review');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!mine?.review || !window.confirm('Delete your review? This can’t be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/${mine.review._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setFormOpen(false);
      setToast('Review deleted');
      await Promise.all([loadList(), loadMine()]);
    } catch {
      setToast('Could not delete — try again');
    }
  };

  const total = summary.count;
  const myReview = mine?.review;

  return (
    <section className="aur-rev" id="reviews" aria-labelledby="aur-rev-title">
      <div className="aur-rev__head">
        <h2 id="aur-rev-title">Customer reviews</h2>
        {!authLoading && !user && (
          <Link href="/login" className="aur-rev__btn">
            Sign in to write a review
          </Link>
        )}
        {mine?.canReview && !formOpen && (
          <button type="button" className="aur-rev__btn" onClick={() => openForm()}>
            Write a review
          </button>
        )}
      </div>

      {state === 'loading' && <p className="aur-rev__note">Loading reviews…</p>}
      {state === 'error' && (
        <p className="aur-rev__note">
          Couldn&apos;t load reviews. <button type="button" className="aur-rev__link" onClick={() => loadList()}>Try again</button>
        </p>
      )}

      {state === 'ready' && (
        <div className="aur-rev__summary">
          {total > 0 ? (
            <>
              <div className="aur-rev__avg">
                <strong>{summary.average.toFixed(1)}</strong>
                <Stars value={summary.average} count={total} size={18} />
                <span>
                  {total} {total === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              <ul className="aur-rev__bars" aria-label="Ratings breakdown">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = summary.distribution?.[n] || 0;
                  return (
                    <li key={n}>
                      <span>{n} star</span>
                      <span className="aur-rev__bar" aria-hidden="true">
                        <i style={{ width: `${(c / total) * 100}%` }} />
                      </span>
                      <span>{c}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="aur-rev__note">No reviews yet. {mine?.canReview ? 'Be the first to share what you think.' : ''}</p>
          )}
        </div>
      )}

      {mine?.needsVerification && <p className="aur-rev__note">Confirm your email address (we sent you a link when you signed up) to write a review.</p>}
      {mine?.needsPurchase && !mine?.needsVerification && <p className="aur-rev__note">Only customers who have received this product can review it.</p>}

      {myReview && !formOpen && (
        <div className="aur-rev__mine">
          <div>
            <p className="aur-rev__mine-label">Your review</p>
            <Stars value={myReview.rating} size={16} />
            {myReview.title && <p className="aur-rev__title">{myReview.title}</p>}
            {myReview.comment && <p className="aur-rev__text">{myReview.comment}</p>}
            {myReview.status === 'hidden' && <p className="aur-rev__hidden">Your review is currently hidden by the store and isn’t shown to other customers.</p>}
          </div>
          <div className="aur-rev__mine-actions">
            <button type="button" className="aur-rev__btn" onClick={() => openForm(myReview)}>
              Edit
            </button>
            <button type="button" className="aur-rev__btn aur-rev__btn--ghost" onClick={remove}>
              Delete
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <form className="aur-rev__form" onSubmit={submit} ref={formRef} noValidate>
          <h3>{myReview ? 'Edit your review' : 'Write a review'}</h3>
          <RatingInput value={rating} onChange={setRating} disabled={saving} />

          <label className="aur-rev__field">
            <span>Title (optional)</span>
            <input type="text" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a few words" disabled={saving} />
          </label>
          <label className="aur-rev__field">
            <span>
              Your review (optional) <em>{comment.length}/2000</em>
            </span>
            <textarea rows={5} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="What did you like? How is the fit and the quality?" disabled={saving} />
          </label>

          {error && (
            <p className="aur-rev__error" role="alert">
              {error}
            </p>
          )}
          <div className="aur-rev__form-actions">
            <button type="submit" className="aur-rev__btn aur-rev__btn--solid" disabled={saving}>
              {saving ? 'Saving…' : myReview ? 'Save changes' : 'Submit review'}
            </button>
            <button type="button" className="aur-rev__btn aur-rev__btn--ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {state === 'ready' && total > 0 && (
        <>
          <div className="aur-rev__toolbar">
            <label>
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul className="aur-rev__list">
            {reviews.map((r) => (
              <li key={r._id} className="aur-rev__item">
                <div className="aur-rev__item-top">
                  <Stars value={r.rating} size={15} />
                  <span className="aur-rev__date">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="aur-rev__title">{r.title}</p>}
                {r.comment && <p className="aur-rev__text">{r.comment}</p>}
                <p className="aur-rev__by">
                  {r.authorName}
                  {r.verifiedPurchase && <span className="aur-rev__verified">Verified purchase</span>}
                </p>
              </li>
            ))}
          </ul>

          {info.page < info.pages && (
            <button type="button" className="aur-rev__btn aur-rev__more" onClick={() => loadList({ page: info.page + 1, append: true })} disabled={more}>
              {more ? 'Loading…' : 'Show more reviews'}
            </button>
          )}
        </>
      )}

      {toast && (
        <div className="aur-rev__toast" role="status">
          {toast}
        </div>
      )}

    </section>
  );
}
