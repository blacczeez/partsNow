import { Mic, ShieldCheck, Zap, Receipt, Wallet, MapPin } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Voice-First Ordering',
    description:
      'Just send a WhatsApp voice note describing what you need. No typing, no apps to download.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality Checked',
    description:
      'Every part is photographed and verified by our sourcing team before dispatch.',
  },
  {
    icon: Zap,
    title: 'Express Delivery',
    description:
      '45-minute delivery within our express zone. Standard delivery for wider areas.',
  },
  {
    icon: Receipt,
    title: 'Transparent Pricing',
    description:
      'See the price breakdown before you pay. No hidden fees or surprises.',
  },
  {
    icon: Wallet,
    title: 'Digital Wallet',
    description:
      'Top up once, order multiple times. Skip the payment step on every order.',
  },
  {
    icon: MapPin,
    title: 'Real-Time Tracking',
    description:
      'Track your parts from market to your door. Know exactly when they\'ll arrive.',
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Why Choose PartsNow
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          Built for the way mechanics and car owners actually work.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-card border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
