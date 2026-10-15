// src/lib/getPolicy.js
// Server-side: POLICY with the live numbers from the backend's GET /api/config.
// Cached for 5 minutes. If the backend can't be reached (or sends something odd) the defaults in lib/policy.js are used,
// so a page never fails to render because of this.
import { POLICY } from '@/lib/policy';
import { API_URL } from '@/lib/imageUrl';

const FIELDS = ['freeShippingThreshold', 'shippingFee', 'returnWindowDays'];

export async function getPolicy() {
  try {
    const res = await fetch(`${API_URL}/api/config`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return POLICY;
    const config = await res.json();
    const live = {};
    for (const key of FIELDS) {
      if (typeof config[key] === 'number' && Number.isFinite(config[key]) && config[key] >= 0) live[key] = config[key];
    }
    return { ...POLICY, ...live };
  } catch {
    return POLICY;
  }
}
