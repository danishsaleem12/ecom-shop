/**
 * Place at: frontend/src/app/care/page.js   ·   Route: /care
 * General fabric care advice. The care label sewn into each garment always comes first.
 * CHANGE: edit the fabric sections to match the fabrics you really sell.
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata = {
  alternates: { canonical: '/care' },
  title: 'Care Guide',
  description: 'How to wash, dry, iron and store your Aurelia pieces so they last: linen, cotton, knitwear, silk and more.',
};

const sections = [
  {
    id: 'label',
    title: 'Start with the label',
    content: (
      <p>
        Every piece has a care label sewn inside. If it says something different from this page, <strong>follow the label</strong>: it is written for that exact
        fabric and finish. The advice below is general guidance for the fabrics we use most.
      </p>
    ),
  },
  {
    id: 'washing',
    title: 'Washing in general',
    content: (
      <ul>
        <li>Wash similar colours together, and wash new dark or bright pieces separately the first few times.</li>
        <li>Turn garments inside out, and close zips and buttons first.</li>
        <li>Use a mild detergent and avoid bleach and fabric softener unless the label allows them.</li>
        <li>Cooler is kinder: 30°C is enough for most everyday wear.</li>
        <li>Do not leave wet laundry bundled up; it can mark the fabric and cause odours.</li>
      </ul>
    ),
  },
  {
    id: 'linen',
    title: 'Linen',
    content: (
      <ul>
        <li>Machine wash cool on a gentle cycle, or hand wash. Linen softens with every wash.</li>
        <li>Shake it out and dry it flat or on a hanger. Avoid hot tumble drying, which can shrink it.</li>
        <li>Iron while slightly damp on a high heat, or steam it. A few creases are part of linen&apos;s character.</li>
      </ul>
    ),
  },
  {
    id: 'cotton',
    title: 'Cotton',
    content: (
      <ul>
        <li>Machine wash cool to warm. Wash dark colours inside out to keep them from fading.</li>
        <li>Line dry in the shade where you can; direct sun fades colour over time.</li>
        <li>Iron on a medium heat, from the inside for prints and embroidery.</li>
      </ul>
    ),
  },
  {
    id: 'knitwear',
    title: 'Knitwear and wool',
    content: (
      <ul>
        <li>Hand wash cool with a wool-friendly detergent, or use a wool cycle if the label allows it. Do not wring or twist.</li>
        <li>Press the water out gently in a towel, reshape, and dry flat. Hanging a wet knit stretches it.</li>
        <li>Fold knitwear rather than hanging it. Small pills can be lifted off with a fabric shaver or comb.</li>
      </ul>
    ),
  },
  {
    id: 'silk',
    title: 'Silk, satin and viscose',
    content: (
      <ul>
        <li>Many of these are best dry cleaned or hand washed cool with a gentle detergent. Check the label first.</li>
        <li>Do not rub, wring or soak for long. Roll in a towel to remove water and dry away from direct heat and sun.</li>
        <li>Iron on a low heat while slightly damp, on the reverse side or with a cloth in between. Test on a hidden spot first.</li>
        <li>Perfume, deodorant and water can mark these fabrics, so let them dry before you dress.</li>
      </ul>
    ),
  },
  {
    id: 'outerwear',
    title: 'Coats and outerwear',
    content: (
      <ul>
        <li>Brush off dirt and air the coat after wearing. Spot clean marks gently.</li>
        <li>Most tailored coats need professional dry cleaning, not the washing machine; follow the label.</li>
        <li>Hang on a wide, shaped hanger so the shoulders keep their form.</li>
      </ul>
    ),
  },
  {
    id: 'storing',
    title: 'Storing your pieces',
    content: (
      <ul>
        <li>Make sure everything is clean and fully dry before putting it away.</li>
        <li>Keep garments in a cool, dry place with some air around them, away from direct sunlight.</li>
        <li>Use breathable garment bags rather than plastic for pieces you store for a long time.</li>
      </ul>
    ),
  },
  {
    id: 'help',
    title: 'Something went wrong?',
    content: (
      <p>
        If a piece arrives damaged or faulty, contact us right away; see <Link href="/shipping#problems">Damaged or wrong items</Link> and{' '}
        <Link href="/terms#returns">Returns and refunds</Link>. Washing a garment against its care label can affect whether it can be returned, so check the
        label first.
      </p>
    ),
  },
];

export default function CarePage() {
  return (
    <LegalPage
      current="care"
      group="guides"
      showUpdated={false}
      eyebrow="Guide"
      title="Care guide"
      intro="A little care keeps your pieces looking their best. Here is how to wash, dry, iron and store them."
      sections={sections}
    />
  );
}
