import Link from 'next/link';
import { Clock, ShieldCheck, Package, Users } from 'lucide-react';

const trustIndicators = [
  { icon: Package, text: '2,000+ Parts Delivered' },
  { icon: ShieldCheck, text: '98% Accuracy Rate' },
  { icon: Clock, text: '45-min Express Zone' },
];

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Stop Losing 3 Hours at Ladipo.
          <br className="hidden sm:block" /> Get Parts Delivered in 45 Minutes.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100 sm:text-lg">
          Your apprentice spends half the day in traffic and at the market.
          We source quality parts from Ladipo and ASPAMDA and bring them
          straight to your workshop.
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

        {/* Social proof */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-200">
          <Users className="h-4 w-4" />
          <span>Trusted by 200+ mechanics and car owners across Lagos</span>
        </div>

        {/* Guarantee badge */}
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-1.5 text-sm text-blue-100">
          <ShieldCheck className="h-4 w-4" />
          <span>Wrong part? We replace it free — no questions asked</span>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
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
