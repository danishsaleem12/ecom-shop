// src/lib/store.js
// ONE place for the store's public contact details.
// Footer, Contact page, Get-in-touch form and Help page all read from here,
// so changing a value here changes it everywhere.

export const STORE = {
  name: 'Aurelia',

  // CHANGE: a real inbox you check (use a store address, not a personal one)
  email: 'hello@yourstore.com',
  supportEmail: 'hello@yourstore.com',

  // CHANGE: shown on the contact page, e.g. '+92 300 1234567'
  phone: '+92 300 0000000',

  // CHANGE: store WhatsApp, digits only with country code (no + or spaces).
  // Leave '' to hide the WhatsApp icon in the footer.
  whatsapp: '',

  // CHANGE: one string per line, shown in the contact form panel
  address: ['Street / area', 'Lahore, Punjab, Pakistan'],

  // CHANGE: opening hours text and timezone label
  hours: { days: 'Mon – Sat: 10am – 7pm', tz: 'PKT' },

  // CHANGE: full profile URLs. Leave '' to hide that icon.
  // Used by the footer (Instagram) and the mobile menu (all four).
  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    pinterest: '',
  },

  // Shown on the Privacy, Terms and Shipping pages.
  // CHANGE lastUpdated whenever you edit one of those pages. jurisdiction = whose laws govern the Terms.
  legal: {
    lastUpdated: '15 October 2026',
    jurisdiction: 'Pakistan',
  },
};

// Reminder while you build for production: these are the values that must be replaced before launch.
if (
  process.env.NODE_ENV === 'production' &&
  /yourstore\.com|0000000|Street \/ area/.test(JSON.stringify([STORE.email, STORE.supportEmail, STORE.phone, STORE.address]))
) {
  console.warn('[store.js] Placeholder contact details are still in src/lib/store.js. Replace them before launch.');
}

// ---- helpers (derived values, so nothing is typed twice) ----

// "Street / area, Lahore, Punjab, Pakistan"
export const addressOneLine = () => STORE.address.filter(Boolean).join(', ');

// Google Maps search link built from the address
export const mapsHref = () =>
  `https://maps.google.com/?q=${encodeURIComponent(addressOneLine())}`;

// tel: link from the display phone number (strips spaces, brackets, dashes)
export const telHref = () => `tel:${STORE.phone.replace(/[^\d+]/g, '')}`;

// "Mon – Sat: 10am – 7pm (PKT)"
export const hoursOneLine = () =>
  STORE.hours.days ? `${STORE.hours.days}${STORE.hours.tz ? ` (${STORE.hours.tz})` : ''}` : '';

// wa.me link with a customer-facing starter message
export const whatsappHref = (text = 'Hi! I have a question about my order.') =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
