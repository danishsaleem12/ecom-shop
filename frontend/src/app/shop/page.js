'use client';

/**
 * Place at: frontend/src/app/shop/page.js
 *
 * All the actual Shop content lives in
 * frontend/src/app/components/ShopCollection.js — this file just wires
 * together the pieces you already have.
 *
 * Both the bag count and the wishlist count now come from their real
 * shared contexts, so the Navbar badges match what's actually saved,
 * everywhere in the app — not just on this page.
 */

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ShopCollection from '@/components/ShopCollection';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

export default function ShopPage() {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} />
      <ShopCollection />
      <Footer />
    </>
  );
}