import { getPolicy } from '@/lib/getPolicy';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  getProduct,
  jsonLdString,
  openGraphFor,
  productImages,
  productJsonLd,
  snippet,
} from '@/lib/seo';

// Title, description, canonical address and share card for /shop/<product id>, taken from the real product.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  // Unknown id (or backend down): a plain title, and keep this address out of search results
  if (!product) return { title: 'Product', robots: { index: false, follow: true } };

  const description = snippet(product.description) || undefined;
  const images = productImages(product, 4);
  const path = `/shop/${product._id}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: openGraphFor({ title: product.name, description, path, images }),
    twitter: { card: 'summary_large_image', title: product.name, description, ...(images.length ? { images: [images[0]] } : {}) },
  };
}

// The structured data Google reads to show price and "in stock" next to the product in search results
export default async function Layout({ children, params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return children;

  const { returnWindowDays } = await getPolicy();
  const data = [
    productJsonLd(product, { returnWindowDays }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: product.name, path: `/shop/${product._id}` },
    ]),
  ];

  return (
    <>
      {data.map((item) => (
        <script key={item['@type']} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(item) }} />
      ))}
      {children}
    </>
  );
}
