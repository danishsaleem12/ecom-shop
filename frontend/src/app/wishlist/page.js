'use client';

/**
 * Place at: frontend/src/app/wishlist/page.js
 *
 * Same composition pattern as Shop and Collections: Navbar, the page's
 * own content component, Footer.
 */

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WishlistCollection from '@/components/WishlistCollection';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

export default function WishlistPage() {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} />
      <WishlistCollection />
      <Footer />
    </>
  );
}