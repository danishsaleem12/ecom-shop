/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · ABOUT PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/about/page.js
 *  Route:    /about
 *
 *  Wires up the shared Navbar over the AboutHero. Add the rest of the About
 *  story (values, timeline, team, etc.) below the hero as you build it out.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Navbar from '@/components/Navbar';
import AboutHero from '@/components/AboutHero';
import OurStory from '@/components/OurStory';
import OurPhilosophy from '@/components/OurPhilosophy';
import CraftMaterials from '@/components/CraftMaterials';
import DesignProcess from '@/components/DesignProcess';
import AureliaWoman from '@/components/AureliaWoman';
import Footer from '@/components/Footer';

export const metadata = {
    title: 'About Aurelia',
    description:
        'More than a fashion brand — Aurelia is a feeling, a vision, and a tribute to the timeless beauty of everyday life.',
};

export default function AboutPage() {
    return (
        <main>
            <Navbar />
            <AboutHero />
            <OurStory />
            <OurPhilosophy />
            <CraftMaterials />
            <DesignProcess />
            <AureliaWoman />
            <Footer />
        </main>
    );
}