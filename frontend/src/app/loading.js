/**
 * Place at: frontend/src/app/loading.js
 * Shown while any page is being fetched / rendered on the server. Pages with their own
 * loading.js (shop, shop/[id], admin) show a skeleton of their layout instead.
 * Styles live in globals.css (.aur-load).
 */

export default function Loading() {
  return (
    <div className="aur-load" role="status" aria-live="polite">
      <span className="aur-load__mark" aria-hidden="true">
        Aurelia
      </span>
      <span className="aur-load__bar" aria-hidden="true" />
      <span className="aur-sr-only">Loading…</span>
    </div>
  );
}
