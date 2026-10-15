import Navbar from '@/components/Navbar';
import ContactHero from '@/components/ContactHero';
import Footer from '@/components/Footer';
import GetInTouch from '@/components/GetInTouch';

export const metadata = {
  alternates: { canonical: '/contact' },
  title: 'Contact',
  description:
    "Whether you have a question about a piece, an order, or simply want to say hello, we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <ContactHero />
        <GetInTouch />
      </main>
      <Footer />
    </>
  );
}