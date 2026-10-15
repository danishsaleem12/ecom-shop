/**
 * Place at: frontend/src/app/faq/page.js   ·   Route: /faq
 * Frequently asked questions, grouped. The questions live in lib/faqs.js; shipping cost, the free-shipping threshold and
 * the return window come live from the backend (GET /api/config) through getPolicy().
 * Also adds FAQ structured data so search engines can show the questions.
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { getPolicy } from '@/lib/getPolicy';
import { buildFaqGroups, flattenFaqs } from '@/lib/faqs';
import { jsonLdString } from '@/lib/seo';

export const metadata = {
  alternates: { canonical: '/faq' },
  title: 'FAQ',
  description: 'Answers about ordering, payment, delivery, returns, sizing, care and your account at Aurelia.',
};

export default async function FaqPage() {
  const groups = buildFaqGroups(await getPolicy());

  const sections = groups.map((g) => ({
    id: g.id,
    title: g.title,
    content: (
      <>
        {g.items.map((item) => (
          <details key={item.q} className="legal__faq">
            <summary>{item.q}</summary>
            <div>
              <p>{item.a}</p>
              {item.link && (
                <p>
                  <Link href={item.link.href}>{item.link.label}</Link>
                </p>
              )}
            </div>
          </details>
        ))}
      </>
    ),
  }));

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: flattenFaqs(groups).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData) }} />
      <LegalPage
        current="faq"
        group="guides"
        showUpdated={false}
        eyebrow="Support"
        title="Frequently asked questions"
        intro="Quick answers about ordering, delivery, returns, sizing and your account."
        sections={sections}
      />
    </>
  );
}
