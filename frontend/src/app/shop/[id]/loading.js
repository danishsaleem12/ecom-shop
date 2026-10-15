/** Place at: frontend/src/app/shop/[id]/loading.js — skeleton of a product page. */

export default function ProductLoading() {
  return (
    <div className="aur-skel-page" role="status" aria-live="polite">
      <div className="aur-skel-split">
        <span className="aur-skel" style={{ aspectRatio: '4 / 5', width: '100%' }} />
        <div>
          <span className="aur-skel" style={{ width: '30%', height: 12 }} />
          <span className="aur-skel" style={{ width: '80%', height: 40, marginTop: 18 }} />
          <span className="aur-skel" style={{ width: '25%', height: 22, marginTop: 18 }} />
          <span className="aur-skel" style={{ width: '100%', height: 12, marginTop: 34 }} />
          <span className="aur-skel" style={{ width: '95%', height: 12, marginTop: 10 }} />
          <span className="aur-skel" style={{ width: '70%', height: 12, marginTop: 10 }} />
          <span className="aur-skel" style={{ width: '100%', height: 52, marginTop: 40, borderRadius: 999 }} />
        </div>
      </div>
      <span className="aur-sr-only">Loading product…</span>
    </div>
  );
}
