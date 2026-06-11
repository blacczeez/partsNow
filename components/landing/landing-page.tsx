import { LandingNav } from '@/components/layout/landing-nav';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { FeaturesSection } from './features-section';
import { ManufacturersSection } from './manufacturers-section';
import { ServiceAreaSection } from './service-area-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ManufacturersSection />
      <ServiceAreaSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
