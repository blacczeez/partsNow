import type { Feature } from '@/lib/data/features';
import { CtaSection } from '@/components/landing/cta-section';

export function FeaturePageLayout({ data }: { data: Feature }) {
  const Icon = data.icon;

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{data.title}</h1>
          <p className="mt-3 text-lg text-blue-100">{data.tagline}</p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-blue-200">
            {data.description}
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Key Benefits
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.benefits.map((benefit) => {
              const BenefitIcon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-card border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <BenefitIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {data.howItWorks.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {data.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-card border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <CtaSection />
    </>
  );
}
