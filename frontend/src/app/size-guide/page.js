/**
 * Place at: frontend/src/app/size-guide/page.js   ·   Route: /size-guide
 * How to measure, and the size chart. The numbers live in lib/sizeGuide.js (replace them with your own patterns' measurements).
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { SIZE_CHART, SIZE_UNIT_NOTE, both } from '@/lib/sizeGuide';

export const metadata = {
  alternates: { canonical: '/size-guide' },
  title: 'Size Guide',
  description: 'How to measure yourself and find your Aurelia size: bust, waist and hip measurements for every size.',
};

const sections = [
  {
    id: 'measure',
    title: 'How to measure',
    content: (
      <>
        <p>Use a soft tape measure over light clothing, and keep it snug but not tight. Stand relaxed with your arms by your sides.</p>
        <ol className="legal__steps">
          <li><strong>Bust:</strong> around the fullest part of your chest, with the tape level across your back.</li>
          <li><strong>Waist:</strong> around the narrowest part of your waist, usually just above the navel.</li>
          <li><strong>Hips:</strong> around the fullest part of your hips, about 20 cm (8 in) below your waist.</li>
        </ol>
        <p>It helps to ask someone to measure you, or to stand in front of a mirror so you can check the tape stays level.</p>
      </>
    ),
  },
  {
    id: 'chart',
    title: 'Size chart',
    content: (
      <>
        <div className="legal__tablewrap">
          <table>
            <caption>Body measurements for each size</caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Bust</th>
                <th scope="col">Waist</th>
                <th scope="col">Hips</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.size}>
                  <th scope="row">{row.size}</th>
                  <td>{both(row.bust)}</td>
                  <td>{both(row.waist)}</td>
                  <td>{both(row.hips)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="legal__note">{SIZE_UNIT_NOTE} Compare them with your own measurements, not with a garment you already own.</p>
      </>
    ),
  },
  {
    id: 'choose',
    title: 'Choosing your size',
    content: (
      <>
        <ul>
          <li>If your measurements fall in different sizes, choose the size that fits your <strong>largest</strong> measurement, especially for fitted styles.</li>
          <li>If you are between two sizes, size up for a relaxed fit and size down for a closer one.</li>
          <li>Different fabrics sit differently: knitwear and stretch fabrics are more forgiving than woven linen or cotton.</li>
          <li>Check the product page for any fit notes, and choose the size button that matches your row in the chart.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'unsure',
    title: 'Still not sure?',
    content: (
      <p>
        Send us your measurements and the piece you like through the <Link href="/contact">contact form</Link> and we will help you choose. If it does not fit
        when it arrives, see <Link href="/terms#returns">Returns and refunds</Link> or the <Link href="/faq">FAQ</Link>.
      </p>
    ),
  },
];

export default function SizeGuidePage() {
  return (
    <LegalPage
      current="size-guide"
      group="guides"
      showUpdated={false}
      eyebrow="Guide"
      title="Size guide"
      intro="Measure yourself, find your row in the chart and choose the matching size."
      sections={sections}
    />
  );
}
