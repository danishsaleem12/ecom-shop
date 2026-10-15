// Place at: frontend/src/app/opengraph-image.js
// The default share picture (1200x630) for any page that has no picture of its own: it is drawn from text, so it
// works before you have real photos. Product pages use the product photo instead. To use your own picture, delete
// this file and put an opengraph-image.jpg (1200x630) in the same folder.
import { ImageResponse } from 'next/og';

export const alt = 'Aurelia | Modern Clothing & Accessories';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6efe8',
          color: '#181513',
        }}
      >
        <div style={{ fontSize: 96, letterSpacing: 24, textTransform: 'uppercase', fontFamily: 'serif' }}>Aurelia</div>
        <div style={{ width: 120, height: 3, background: '#c98a63', margin: '36px 0' }} />
        <div style={{ fontSize: 34, letterSpacing: 6, textTransform: 'uppercase', color: '#6b5f55' }}>Modern Clothing &amp; Accessories</div>
      </div>
    ),
    { ...size }
  );
}
