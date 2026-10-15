/** Place at: frontend/src/app/shop/loading.js — skeleton of the shop grid while the page loads. */

export default function ShopLoading() {
  return (
    <div className="aur-skel-page" role="status" aria-live="polite">
      <span className="aur-skel" style={{ width: 'min(260px, 60%)', height: 40 }} />
      <span className="aur-skel" style={{ width: 'min(420px, 90%)', height: 14, marginTop: 16 }} />
      <div className="aur-skel-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <span className="aur-skel" style={{ aspectRatio: '3 / 4', width: '100%' }} />
            <span className="aur-skel" style={{ width: '70%', height: 14, marginTop: 14 }} />
            <span className="aur-skel" style={{ width: '35%', height: 14, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <span className="aur-sr-only">Loading products…</span>
    </div>
  );
}
