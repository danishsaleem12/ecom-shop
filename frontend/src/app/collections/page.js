'use client';

/**
 * Place at: frontend/src/app/collections/page.js
 *
 * Same composition pattern as the Shop page: Navbar, the page's own
 * content component, Footer.
 *
 * Both the bag count and the wishlist count now come from their real
 * shared contexts, matching the Shop and Wishlist pages.
 */

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CollectionsHero from '@/components/CollectionsHero';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import CollectionsList from '@/components/CollectionsList';

export default function CollectionsPage() {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} />
      <main>
        <CollectionsHero />
        <CollectionsList />
      </main>
      <Footer />
    </>
  );
}