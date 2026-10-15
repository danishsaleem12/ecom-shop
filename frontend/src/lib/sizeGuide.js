// src/lib/sizeGuide.js
// The numbers behind the Size guide page (/size-guide).
//
// CHANGE BEFORE LAUNCH: these are common women's body measurements, used as a starting point. Replace them with
// the measurements your own patterns are cut to (ask your tailor / manufacturer), and keep the size names the same
// as the sizes you create on your products in the admin, so a customer can match the chart to the size buttons.
// Measurements are in inches; the page shows centimetres next to them (worked out here, so nothing is typed twice).

export const SIZE_UNIT_NOTE = 'Body measurements, not garment measurements.';

export const SIZE_CHART = [
  { size: 'XS', bust: 32, waist: 25, hips: 35 },
  { size: 'S', bust: 34, waist: 27, hips: 37 },
  { size: 'M', bust: 36, waist: 29, hips: 39 },
  { size: 'L', bust: 38, waist: 31, hips: 41 },
  { size: 'XL', bust: 40, waist: 33, hips: 43 },
];

const toCm = (inches) => Math.round(inches * 2.54);

/** 34 -> "34 in / 86 cm" */
export const both = (inches) => `${inches} in / ${toCm(inches)} cm`;
