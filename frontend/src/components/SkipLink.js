'use client';

/**
 * frontend/src/components/SkipLink.js — "Skip to main content", the first thing a keyboard or screen-reader user
 * reaches on every page. It stays invisible until it receives focus (styles: .aur-skip in globals.css).
 * Pages build their own <main>, so this finds it and gives it the id the link points to.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SkipLink() {
  const pathname = usePathname();

  // After every page change make sure the page's <main> carries the id the link points to
  useEffect(() => {
    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'main-content';
  }, [pathname]);

  const skip = (e) => {
    const main = document.querySelector('main');
    if (!main) return; // no landmark on this page: let the link do nothing harmful
    e.preventDefault();
    if (!main.id) main.id = 'main-content';
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  };

  return (
    <a href="#main-content" className="aur-skip" onClick={skip}>
      Skip to main content
    </a>
  );
}
