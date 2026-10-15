import { resolveCollectionPage } from '@/lib/collections';
import { openGraphFor } from '@/lib/seo';

// Title and description for /collections/<slug>. Unknown slugs get no special metadata (the page itself shows a 404).
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = resolveCollectionPage(slug);
  if (!page) return { title: 'Collection not found', robots: { index: false } };
  const title = page.title;
  const description = `${page.description} Shop the Aurelia ${page.title} ${page.kind === 'category' ? 'collections' : 'collection'}.`;
  const path = `/collections/${slug}`;
  return { title, description, alternates: { canonical: path }, openGraph: openGraphFor({ title, description, path, images: page.image ? [page.image] : [] }) };
}

export default function Layout({ children }) {
  return children;
}
