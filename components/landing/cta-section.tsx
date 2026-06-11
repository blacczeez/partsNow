import Link from 'next/link';
import { ShieldCheck, Clock, CreditCard } from 'lucide-react';

const guarantees = [
  { icon: ShieldCheck, text: 'Wrong part? Free replacement' },
  { icon: Clock, text: 'Late delivery? We refund the fee' },
  { icon: CreditCard, text: 'No hidden charges, ever' },
];

export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Every Hour at the Market Is Money You&apos;re Not Making
        </h2>
        <p className="mt-3 text-base text-blue-100">
          200+ mechanics already get their parts delivered. Send your first
          order today and see why they never went back.
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
            Get Started Free
          </Link>
        </div>

        {/* Risk reversal guarantees */}
        <div className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
          {guarantees.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-blue-200">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
