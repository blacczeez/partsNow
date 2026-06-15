'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Award, PackageCheck, Wallet } from 'lucide-react';
import { PageBackButton } from '@/components/layout/page-back-button';
import { formatCurrency } from '@/lib/utils/format';
import { config } from '@/lib/config';
import type { LoyaltyTierDefinition } from '@/lib/constants/loyalty';
import type { LoyaltyThresholds } from '@/lib/services/loyalty-config';

interface LoyaltyConfigResponse {
  enabled: boolean;
  thresholds: LoyaltyThresholds;
  tiers: LoyaltyTierDefinition[];
}

export default function HowLoyaltyWorksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <HowLoyaltyWorksContent />
    </Suspense>
  );
}

function HowLoyaltyWorksContent() {
  const [data, setData] = useState<LoyaltyConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/loyalty')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load loyalty info');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const baseMarkup = config.business.defaultMarkupPercentage;
  const thresholds = data?.thresholds;

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <PageBackButton fallbackHref="/account/loyalty" />
        <h1 className="text-xl font-bold text-slate-900">How loyalty works</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : data ? (
        <div className="space-y-6">
          <section className="rounded-card border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">The short version</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              The more <strong>delivered and paid</strong> orders you complete, the higher your
              loyalty tier. Higher tiers can lower the <strong>service fee</strong> (platform
              markup) on parts — not the vendor price itself. Your tier at checkout determines
              the fee you pay on that order.
            </p>
            {!data.enabled && (
              <p className="mt-3 text-sm text-amber-700">
                Loyalty fee discounts are currently turned off platform-wide. Tier milestones
                still apply for status.
              </p>
            )}
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">What counts toward your tier</h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                · Orders must reach <strong>Delivered</strong> status and be{' '}
                <strong>paid</strong> (wallet, card, or COD collected).
              </li>
              <li>
                · Cancelled, failed, or unpaid orders do <strong>not</strong> count.
              </li>
              <li>
                · Your order count and lifetime spend update after delivery — not when you
                place the order.
              </li>
              <li>
                · Partner tier needs both enough orders <em>and</em> enough lifetime spend
                {thresholds
                  ? ` (${thresholds.partnerMinOrders}+ orders and ${formatCurrency(thresholds.partnerMinLifetimeSpend)}+ spend)`
                  : ''}
                .
              </li>
            </ul>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">Checkout vs after delivery</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-slate-600">
              When you check out, we use your <strong>current tier</strong> to calculate the
              service fee on that order. After the order is delivered and paid, we update your
              stats and may promote you to the next tier for <strong>future</strong> orders.
            </p>
            <p className="text-sm text-slate-600">
              Example: you are Verified with 4 delivered orders. Order #5 might still checkout
              at Verified rates; once it is delivered, you can move to Trusted and save on
              order #6.
            </p>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-900">Tiers & benefits</h2>
            <p className="mb-4 text-sm text-slate-600">
              Standard service fee is {baseMarkup}% on parts subtotal. Trusted and Partner
              tiers reduce that fee by the amounts below.
            </p>
            <div className="space-y-3">
              {data.tiers.map((tier) => (
                <div
                  key={tier.tier}
                  className="rounded-button border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="font-medium text-slate-900">{tier.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tier.minOrders > 0 && `${tier.minOrders}+ delivered orders`}
                    {tier.minLifetimeSpend > 0 &&
                      ` · ${formatCurrency(tier.minLifetimeSpend)}+ lifetime spend`}
                    {tier.minOrders === 0 && tier.minLifetimeSpend === 0 && 'Everyone starts here'}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {tier.benefits.map((benefit) => (
                      <li key={benefit} className="text-sm text-slate-700">
                        · {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <h2 className="mb-2 font-semibold text-slate-900">Verified vs Trusted</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              <strong>Verified</strong> (
              {thresholds?.verifiedMinOrders ?? 5}+ orders) is a status milestone — thanks for
              being a regular customer, but the service fee stays at {baseMarkup}%.{' '}
              <strong>Trusted</strong> (
              {thresholds?.trustedMinOrders ?? 20}+ orders) is when fee discounts kick in:{' '}
              {baseMarkup - (thresholds?.trustedDiscountPercentage ?? 5)}% service fee (
              {thresholds?.trustedDiscountPercentage ?? 5} percentage points off).
            </p>
          </section>

          <section className="rounded-card border border-dashed border-slate-300 bg-slate-50 p-4">
            <h2 className="mb-2 font-semibold text-slate-700">Good to know</h2>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>· Loyalty savings apply to the service fee only, not delivery.</li>
              <li>· Delivery fees follow package weight — see How delivery pricing works.</li>
              <li>· Admins can manually adjust tiers in exceptional cases.</li>
              <li>· WhatsApp orders use the same tiers and fees as the web app.</li>
            </ul>
          </section>

          <p className="text-center text-sm text-slate-500">
            <Link href="/account/loyalty" className="text-primary hover:underline">
              View your loyalty progress
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
