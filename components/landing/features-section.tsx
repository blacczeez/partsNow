import { Mic, ShieldCheck, Zap, Receipt, Wallet, MapPin } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Just Talk, We Handle the Rest',
    description:
      'Send a WhatsApp voice note describing the part. No typing, no apps to install — order the way you already communicate.',
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
      'Express delivery within 10km of the market. Your customer\'s car doesn\'t wait — and neither do you.',
  },
  {
    icon: Receipt,
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

export function FeaturesSection() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Built for How You Actually Work
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          No apps to learn, no market trips, no guesswork. Just parts at your door.
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
