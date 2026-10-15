// src/lib/returns.js — labels for return requests, shared by the customer and admin pages.
// The reason values must match RETURN_REASONS in backend/utils/returns.js.

export const RETURN_REASONS = [
  { value: 'wrong-size', label: 'Wrong size or fit' },
  { value: 'not-as-described', label: 'Not as described' },
  { value: 'damaged', label: 'Arrived damaged or faulty' },
  { value: 'changed-mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

export const reasonLabel = (value) => RETURN_REASONS.find((r) => r.value === value)?.label || value;

// What the customer sees for each stage
export const RETURN_STATUS_LABEL = {
  requested: 'Return requested',
  approved: 'Return approved',
  rejected: 'Return declined',
  received: 'Item received',
  refunded: 'Refunded',
};
