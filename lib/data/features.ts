import {
  Zap,
  ShieldCheck,
  Wallet,
  MapPin,
  Star,
  Clock,
  Truck,
  Camera,
  Users,
  CreditCard,
  Bell,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface FeatureBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureStep {
  number: number;
  title: string;
  description: string;
}

export interface FeatureStat {
  value: string;
  label: string;
}

export interface Feature {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  benefits: FeatureBenefit[];
  howItWorks: FeatureStep[];
  stats: FeatureStat[];
}

const features: Feature[] = [
  {
    slug: 'instant-delivery',
    title: '45-Minute Delivery',
    tagline: 'From market to your workshop, faster than you can say Ladipo.',
    description:
      'Our express delivery zone covers a 10km radius around major spare parts markets. The moment your order is sourced and verified, a dispatch rider picks it up and brings it straight to you.',
    icon: Zap,
    benefits: [
      {
        icon: Clock,
        title: 'Express Zone Coverage',
        description:
          'Workshops within 10km of Ladipo or ASPAMDA markets get 45-minute delivery as standard.',
      },
      {
        icon: Truck,
        title: 'Dedicated Dispatch Riders',
        description:
          'Our riders know Lagos roads. They pick up from the market gate and ride directly to you — no detours.',
      },
      {
        icon: Bell,
        title: 'Live ETA Updates',
        description:
          'Get WhatsApp notifications at every stage — sourcing, picked, dispatched, and arriving soon.',
      },
    ],
    howItWorks: [
      {
        number: 1,
        title: 'Order Confirmed',
        description:
          'Once your payment is confirmed, a runner at the market starts sourcing immediately.',
      },
      {
        number: 2,
        title: 'Parts Picked & Verified',
        description:
          'Runner finds and photographs each part. Rider picks up from the market gate.',
      },
      {
        number: 3,
        title: 'Delivered to You',
        description:
          'Rider navigates to your address. You receive the parts and get on with the job.',
      },
    ],
    stats: [
      { value: '45 min', label: 'Average express delivery' },
      { value: '10 km', label: 'Express zone radius' },
      { value: '98%', label: 'On-time delivery rate' },
    ],
  },
  {
    slug: 'sourcing',
    title: 'Expert Parts Sourcing',
    tagline: 'Market-tested runners who know every shop in Ladipo.',
    description:
      'Our on-ground runners are experienced market professionals. They know which vendors have the best parts, fair prices, and consistent stock. Every part is photographed and verified before dispatch.',
    icon: ShieldCheck,
    benefits: [
      {
        icon: Users,
        title: 'Trained Runner Network',
        description:
          'Runners are recruited from the market community. They know vendors, prices, and product quality by heart.',
      },
      {
        icon: Camera,
        title: 'QC Photo Verification',
        description:
          'Every part is photographed next to your reference. You see exactly what you\'re getting before it leaves the market.',
      },
      {
        icon: ShieldCheck,
        title: 'Vetted Vendor Network',
        description:
          'We track vendor reliability scores. Consistent quality issues get vendors removed from our network.',
      },
    ],
    howItWorks: [
      {
        number: 1,
        title: 'Runner Assigned',
        description:
          'An available runner at the market accepts your order and heads to the right vendor.',
      },
      {
        number: 2,
        title: 'Source & Verify',
        description:
          'Runner finds the part, checks quality, photographs it, and records the price.',
      },
      {
        number: 3,
        title: 'Handoff to Rider',
        description:
          'Verified parts are packaged and handed to a dispatch rider at the market gate.',
      },
    ],
    stats: [
      { value: '98%', label: 'Part accuracy rate' },
      { value: '30 min', label: 'Average sourcing time' },
      { value: '500+', label: 'Vetted vendors' },
    ],
  },
  {
    slug: 'wallet',
    title: 'PartsDey Wallet',
    tagline: 'Load once, order all week. No fumbling with cash or transfers.',
    description:
      'Top up your PartsDey Wallet and enjoy instant checkout on every order. No waiting for bank transfers to confirm, no counting cash — just tap and order.',
    icon: Wallet,
    benefits: [
      {
        icon: Zap,
        title: 'Instant Checkout',
        description:
          'Wallet payments confirm immediately. Your order starts being sourced the moment you tap confirm.',
      },
      {
        icon: CreditCard,
        title: 'Multiple Top-Up Methods',
        description:
          'Fund your wallet via card, bank transfer. Whatever works for you.',
      },
      {
        icon: ShieldCheck,
        title: 'Cash on Delivery Option',
        description:
          'Prefer to pay when parts arrive? COD is available for orders under \u20A6100,000.',
      },
    ],
    howItWorks: [
      {
        number: 1,
        title: 'Top Up Your Wallet',
        description:
          'Add funds via Paystack — card, bank transfer. Funds are available instantly.',
      },
      {
        number: 2,
        title: 'Order & Pay Instantly',
        description:
          'Select Wallet at checkout. Payment confirms in seconds and sourcing starts immediately.',
      },
      {
        number: 3,
        title: 'Track Your Spending',
        description:
          'View your full transaction history — top-ups, orders, and refunds — all in one place.',
      },
    ],
    stats: [
      { value: 'Instant', label: 'Payment confirmation' },
      { value: '\u20A65,000', label: 'Minimum top-up' },
      { value: '0%', label: 'Wallet fees' },
    ],
  },
  {
    slug: 'tracking',
    title: 'Live Order Tracking',
    tagline: 'Know exactly where your parts are, from market to your door.',
    description:
      'Follow your order through every step — sourcing, verification, dispatch, and delivery. See your rider\'s live location and real-time ETA so you can plan your work instead of guessing.',
    icon: MapPin,
    benefits: [
      {
        icon: MapPin,
        title: 'Real-Time Rider Location',
        description:
          'See your rider on the map as they navigate to your workshop. Location updates every 30 seconds.',
      },
      {
        icon: Clock,
        title: 'Accurate ETA',
        description:
          'Dynamic ETA based on actual rider position and traffic conditions. No more guessing.',
      },
      {
        icon: Bell,
        title: 'Stage-by-Stage Notifications',
        description:
          'Get a WhatsApp message at every key moment — sourcing started, parts picked, rider dispatched, arriving soon.',
      },
    ],
    howItWorks: [
      {
        number: 1,
        title: 'Order Placed',
        description:
          'Your tracking page is live the moment your order is confirmed. Follow sourcing progress.',
      },
      {
        number: 2,
        title: 'Rider Dispatched',
        description:
          'Once the rider picks up, a live map appears showing their real-time location and ETA.',
      },
      {
        number: 3,
        title: 'Delivery Confirmed',
        description:
          'Rider arrives, you receive parts, and the order is marked complete. Rate your experience.',
      },
    ],
    stats: [
      { value: '30s', label: 'Location update interval' },
      { value: '4 stages', label: 'Tracked milestones' },
      { value: '4.5/5', label: 'Average customer rating' },
    ],
  },
  {
    slug: 'loyalty',
    title: 'Loyalty Rewards',
    tagline: 'Order more, pay less. Your loyalty is rewarded from day one.',
    description:
      'Every order moves you up the loyalty ladder. Higher tiers unlock lower prices, priority sourcing, and exclusive perks. The more you trust us with your parts, the more you save.',
    icon: Star,
    benefits: [
      {
        icon: TrendingUp,
        title: 'Automatic Tier Progression',
        description:
          'Your tier upgrades automatically as you order. No points to track or codes to enter.',
      },
      {
        icon: CreditCard,
        title: 'Lower Prices at Higher Tiers',
        description:
          'Trusted mechanics save 5% on markup. Partner mechanics save 8%. Savings apply to every order.',
      },
      {
        icon: Star,
        title: 'Partner Perks',
        description:
          'Top-tier members get priority runner assignment, dedicated support, and early access to new features.',
      },
    ],
    howItWorks: [
      {
        number: 1,
        title: 'Start as New',
        description:
          'Every customer starts at the New tier. Place your first 5 orders to reach Verified.',
      },
      {
        number: 2,
        title: 'Grow to Trusted',
        description:
          'After 20 orders you become Trusted and unlock 5% discount on every order.',
      },
      {
        number: 3,
        title: 'Reach Partner',
        description:
          '50+ orders and \u20A6500,000 lifetime spend unlocks Partner tier with 8% discount and priority service.',
      },
    ],
    stats: [
      { value: '4 tiers', label: 'Loyalty levels' },
      { value: 'Up to 8%', label: 'Discount on markup' },
      { value: 'Automatic', label: 'Tier upgrades' },
    ],
  },
];

export function getAllFeatures(): Feature[] {
  return features;
}

export function getFeatureBySlug(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug);
}
