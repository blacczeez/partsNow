import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllFeatures } from '@/lib/data/features';
import { CtaSection } from '@/components/landing/cta-section';

export const metadata: Metadata = {
  title: 'Features | PartsDey',
  description:
    'Explore all PartsDey features — 45-minute delivery, expert sourcing, wallet payments, live tracking, and loyalty rewards.',
};

export default function FeaturesPage() {
  const features = getAllFeatures();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Everything You Need to Get Parts Fast
          </h1>
          <p className="mt-3 text-lg text-blue-100">
            From ordering to delivery, every step is designed to save you time
            and money.
          </p>
        </div>
      </section>

      {/* Feature cards grid */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className="group rounded-card border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-slate-900">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                    {feature.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Learn more
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
