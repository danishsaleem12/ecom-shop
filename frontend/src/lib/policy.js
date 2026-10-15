// src/lib/policy.js
// The store's customer-facing policy numbers, used by the Help page and the legal pages (Privacy, Terms,
// Shipping) so those texts always agree with each other.
//
// returnWindowDays, freeShippingThreshold and shippingFee are owned by the BACKEND (backend/utils/storeConfig.js,
// served at GET /api/config). The values below are only the FALLBACK used when the backend can't be reached; the
// site reads the live numbers through getPolicy() (server pages) and usePolicy() (client components).
// Change them in the backend's environment (FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, RETURN_WINDOW_DAYS), not here.
//
// The rest (delivery times, refund time, home city) is copy for the website only and is edited here.

export const POLICY = {
  homeCity: 'Lahore', // the city "within the city" delivery refers to — change it if your store is elsewhere
  returnWindowDays: 14,
  freeShippingThreshold: 15000,
  shippingFee: 350,
  deliveryCity: '2–4 business days',
  deliveryNationwide: '4–7 business days',
  refundDays: '5–7 business days',
};

// 15000 -> "Rs 15,000"
export const pkr = (n) => `Rs ${Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
