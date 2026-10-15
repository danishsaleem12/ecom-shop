/** Place at: frontend/src/app/admin/loading.js — skeleton shown while an admin page loads. */

export default function AdminLoading() {
  return (
    <div className="aur-skel-page" style={{ paddingTop: 40 }} role="status" aria-live="polite">
      <span className="aur-skel" style={{ width: 'min(480px, 100%)', height: 36, borderRadius: 999 }} />
      <span className="aur-skel" style={{ width: 200, height: 34, marginTop: 36 }} />
      <div style={{ display: 'grid', gap: 14, marginTop: 28 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="aur-skel" style={{ height: 110, borderRadius: 16 }} />
        ))}
      </div>
      <span className="aur-sr-only">Loading…</span>
    </div>
  );
}
