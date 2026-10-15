import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { PolicyProvider } from "@/context/PolicyContext";
import Analytics from "@/components/Analytics";
import SkipLink from "@/components/SkipLink";
import { getPolicy } from "@/lib/getPolicy";
import { SITE_URL, jsonLdString } from "@/lib/seo";
import { STORE } from "@/lib/store";

// NEXT_PUBLIC_SITE_URL (your live address, e.g. https://www.yourstore.com) makes share-card and canonical URLs absolute; see lib/seo.js.

const DESCRIPTION =
  "Shop timeless, natural-fabric clothing and accessories from Aurelia. Delivered across Pakistan, pay on delivery.";

export const metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  // Pages set a plain title ("Shop") and the template adds the store name: "Shop | Aurelia".
  title: { default: "Aurelia | Modern Clothing & Accessories", template: "%s | Aurelia" },
  description: DESCRIPTION,
  applicationName: "Aurelia",
  openGraph: {
    type: "website",
    siteName: "Aurelia",
    locale: "en_PK",
    title: "Aurelia | Modern Clothing & Accessories",
    description: DESCRIPTION,
  },
  // Large picture when a link is shared on X / Twitter (the picture itself comes from openGraph / opengraph-image.js)
  twitter: { card: "summary_large_image", title: "Aurelia | Modern Clothing & Accessories", description: DESCRIPTION },
};

// Tells search engines who the store is (name, address of the site, social profiles). Skipped until the live
// address is set, because the data needs it.
const ORGANIZATION = SITE_URL
  ? {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE.name,
      url: SITE_URL,
      ...(Object.values(STORE.social).some(Boolean) ? { sameAs: Object.values(STORE.social).filter(Boolean) } : {}),
    }
  : null;

export default async function RootLayout({ children }) {
  // Shipping fee, free-shipping threshold and return window come from the backend (GET /api/config)
  const policy = await getPolicy();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50">
        <SkipLink />
        {ORGANIZATION && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ORGANIZATION) }} />}
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <PolicyProvider value={policy}>{children}</PolicyProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        {/* Google Analytics + cookie notice: renders nothing unless NEXT_PUBLIC_GA_ID is set (see lib/analytics.js) */}
        <Analytics />
      </body>
    </html>
  );
}
