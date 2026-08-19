import {
  MessageCircle,
  ShieldCheck,
  Zap,
  LockKeyhole,
  Wallet,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { MarketingCanvas, MARKETING_SECTION_SPACE, marketingType } from '@/components/layout/marketing-canvas';
import { FeatureVideo } from '@/components/landing/feature-video';

const leftFeatures = [
  {
    icon: MessageCircle,
    title: 'Just Talk, We Handle the Rest',
    description:
      'Send a WhatsApp voice note describing the part. No typing, no apps to install, order the way you already communicate.',
  },
  {
    icon: ShieldCheck,
    title: 'Never Get the Wrong Part Again',
    description:
      'Our runners photograph every part and verify it before dispatch. You confirm before it leaves the market.',
  },
  {
    icon: Zap,
    title: 'Back to Work in 45 Minutes',
    description:
      "Express delivery within 10km of the market. Your customer's car doesn't wait — and neither do you.",
  },
];

const rightFeatures = [
  {
    icon: LockKeyhole,
    title: 'No Surprise Charges',
    description:
      'See the full price breakdown before you pay. What we quote is what you pay — no hidden markup.',
  },
  {
    icon: Wallet,
    title: 'Pay Once, Order All Week',
    description:
      'Load your wallet and skip the payment step on every order. No more counting cash or waiting for transfers.',
  },
  {
    icon: MapPin,
    title: 'Know Exactly When It Arrives',
    description:
      'Live tracking from market to your door. Plan your work instead of guessing when parts will show up.',
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex w-full flex-col items-start rounded-xl bg-[#FBFBFB] px-4 py-[15px]"
      style={{ boxShadow: '0px 2px 13.4px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex w-full flex-col items-start gap-3">
        <Icon className="h-[25px] w-[25px]" color="#F4AF6E" strokeWidth={2} />
        <h3 className="font-marketing-display text-base leading-5 text-[#151515]">
          {title}
        </h3>
        <p
          className={`${marketingFont.className} text-base leading-[22px] tracking-[-0.01em] text-[#828282]`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureColumn({
  features,
  className,
}: {
  features: typeof leftFeatures;
  className?: string;
}) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-3 ${className ?? ''}`}>
      {features.map((feature) => (
        <FeatureCard key={feature.title} {...feature} />
      ))}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="bg-[#F8F8F8]">
      <MarketingCanvas className={`flex flex-col items-center gap-12 px-4 sm:px-10 lg:gap-[100px] ${MARKETING_SECTION_SPACE}`}>
        <h2 className={`font-marketing-display max-w-[528px] text-center text-[#202020] ${marketingType.section}`}>
          Built for How You Actually Work
        </h2>

        <div className="flex w-full max-w-[1120px] flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-2">
          <FeatureColumn features={leftFeatures} className="lg:pt-8" />
          <FeatureVideo />
          <FeatureColumn features={rightFeatures} className="lg:pt-[34px]" />
        </div>
      </MarketingCanvas>
    </section>
  );
}
