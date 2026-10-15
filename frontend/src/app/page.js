import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProductSection from "@/components/ProductSection";
import CollectionsSection from "@/components/CollectionsSection";
import StorySection from "@/components/Storysection";
import FeaturedProductSection from "@/components/FeaturedProductSection";
import NewArrivalsSection from "@/components/Newarrivalssection";
import NewsletterSection from "@/components/Newslettersection";
import Footer from "@/components/Footer";

export const metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProductSection />
        <CollectionsSection />
        <StorySection />
        <FeaturedProductSection />
        <NewArrivalsSection />
        <NewsletterSection />
      </main>
      <Footer />
    </>
  );
}