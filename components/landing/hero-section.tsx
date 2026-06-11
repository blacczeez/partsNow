import Link from 'next/link';
import { Clock, ShieldCheck, Truck } from 'lucide-react';

const trustIndicators = [
  { icon: Clock, text: '45-min Express Delivery' },
  { icon: ShieldCheck, text: 'Quality Checked Parts' },
  { icon: Truck, text: 'Free Delivery Above N50k' },
];

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Get Spare Parts Delivered
          <br className="hidden sm:block" /> in 45 Minutes
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100 sm:text-lg">
          We source quality auto parts from Ladipo and ASPAMDA markets and
          deliver them straight to your workshop or home in Lagos.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://wa.me/234XXXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-button bg-secondary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-secondary-dark sm:w-auto"
          >
            Order via WhatsApp
          </a>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-button border-2 border-white px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Order on Web
          </Link>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
          {trustIndicators.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-blue-100">
              <Icon className="h-5 w-5 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
