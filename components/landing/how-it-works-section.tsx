import { Search, ShieldCheck, Truck } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Search,
    title: 'Tell Us What You Need',
    description:
      'Send a WhatsApp voice note or search our catalogue. Describe the part, your vehicle, and we\'ll find it.',
  },
  {
    number: 2,
    icon: ShieldCheck,
    title: 'We Source & Verify',
    description:
      'Our runners go to Ladipo/ASPAMDA, find the exact part, verify quality, and take photos for confirmation.',
  },
  {
    number: 3,
    icon: Truck,
    title: 'Delivered to Your Door',
    description:
      'A dispatch rider picks up and delivers to your workshop or home within 45 minutes.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          How It Works
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          From order to delivery in three simple steps.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div className="mt-2 flex items-center justify-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {number}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
