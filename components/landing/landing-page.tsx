import { LandingNav } from '@/components/layout/landing-nav';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { TestimonialsSection } from './testimonials-section';
import { FeaturesSection } from './features-section';
import { ManufacturersSection } from './manufacturers-section';
import { ServiceAreaSection } from './service-area-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-primary to-primary-dark">
        <LandingNav />
        <HeroSection />
      </div>
      <HowItWorksSection />
      <TestimonialsSection />
      <FeaturesSection />
      <ManufacturersSection />
      <ServiceAreaSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
