import { MarketingNav } from '@/components/layout/marketing-nav';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from './hero-section';
import { FeaturedCategoriesSection } from './featured-categories-section';
import { HowItWorksSection } from './how-it-works-section';
import { TestimonialsSection } from './testimonials-section';
import { FeaturesSection } from './features-section';
import { ServiceAreaSection } from './service-area-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <div className="relative">
        <MarketingNav variant="transparent" />
        <HeroSection />
      </div>
      <FeaturedCategoriesSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ServiceAreaSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
      <Footer overlapCta />
    </div>
  );
}
