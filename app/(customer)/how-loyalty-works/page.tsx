'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Loader2,
  ArrowLeft,
  Crown,
  PackageCheck,
  Wallet,
  Gift,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { LoyaltyTierDefinition } from '@/lib/constants/loyalty';
import type { LoyaltyThresholds } from '@/lib/types/loyalty-thresholds';

interface LoyaltyConfigResponse {
  enabled: boolean;
  baseMarkupPercentage: number;
  thresholds: LoyaltyThresholds;
  tiers: LoyaltyTierDefinition[];
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  verified: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  trusted: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  partner: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

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
  const searchParams = useSearchParams();
  const fromLoyalty = searchParams.get('from') === 'loyalty';

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

  const baseMarkup = data?.baseMarkupPercentage ?? 15;
  const thresholds = data?.thresholds;

  const backHref = fromLoyalty ? '/account?tab=profile' : '/account';

  return (
    <div className="px-4 pb-12 pt-4 lg:px-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 py-4 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
          Home
        </Link>
        <span className="text-slate-400">&rsaquo;</span>
        <Link href={backHref} className="text-slate-500 hover:text-slate-700">
          My Account
        </Link>
        <span className="text-slate-400">&rsaquo;</span>
        <span className="font-medium text-slate-900">Loyalty Program</span>
      </nav>

      {/* Back + title */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">How loyalty works</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Hero */}
          <div className="rounded-2xl bg-[#1E1145] px-6 py-8 text-white">
            <Crown className="h-8 w-8 text-[#E07A3A]" />
            <h2 className="mt-3 text-lg font-bold">The short version</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              The more delivered and paid orders you complete, the higher your
              loyalty tier. Higher tiers can lower the service fee (platform
              markup) on parts — not the vendor price itself. Your tier at
              checkout determines the fee you pay on that order.
            </p>
            {!data.enabled && (
              <div className="mt-4 rounded-lg bg-amber-500/20 px-4 py-2.5">
                <p className="text-sm text-amber-200">
                  Loyalty fee discounts are currently turned off platform-wide.
                  Tier milestones still apply for status.
                </p>
              </div>
            )}
          </div>

          {/* What counts */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-[#E07A3A]" />
              <h2 className="text-base font-bold text-slate-900">
                What counts toward your tier
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  text: 'Orders must reach Delivered status and be paid (wallet, card, or COD collected).',
                  positive: true,
                },
                {
                  text: 'Cancelled, failed, or unpaid orders do not count.',
                  positive: false,
                },
                {
                  text: 'Your order count and lifetime spend update after delivery — not when you place the order.',
                  positive: true,
                },
                {
                  text: `Partner tier needs both enough orders and enough lifetime spend${
                    thresholds
                      ? ` (${thresholds.partnerMinOrders}+ orders and ${formatCurrency(thresholds.partnerMinLifetimeSpend)}+ spend)`
                      : ''
                  }.`,
                  positive: true,
                },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2.5">
                  {item.positive ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <span className="text-xs font-bold text-red-500">×</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout vs after delivery */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#E07A3A]" />
              <h2 className="text-base font-bold text-slate-900">
                Checkout vs after delivery
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              When you check out, we use your <strong>current tier</strong> to
              calculate the service fee on that order. After the order is
              delivered and paid, we update your stats and may promote you to
              the next tier for <strong>future</strong> orders.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Example
              </p>
              <p className="mt-1 text-sm text-slate-600">
                You are Verified with 4 delivered orders. Order #5 still checks
                out at Verified rates. Once delivered, you move to Trusted and
                save on order #6.
              </p>
            </div>
          </div>

          {/* Tiers & benefits */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#E07A3A]" />
              <h2 className="text-base font-bold text-slate-900">
                Tiers & benefits
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Standard service fee is {baseMarkup}% on parts subtotal. Trusted
              and Partner tiers reduce that fee.
            </p>

            <div className="mt-5 space-y-3">
              {data.tiers.map((tier) => {
                const colors = TIER_COLORS[tier.tier] || TIER_COLORS.new;
                return (
                  <div
                    key={tier.tier}
                    className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}
                  >
                    <div className="flex items-center gap-2">
                      <Crown className={`h-4 w-4 ${colors.text}`} />
                      <p className={`font-semibold ${colors.text}`}>
                        {tier.label}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {tier.minOrders > 0 &&
                        `${tier.minOrders}+ delivered orders`}
                      {tier.minLifetimeSpend > 0 &&
                        ` · ${formatCurrency(tier.minLifetimeSpend)}+ lifetime spend`}
                      {tier.minOrders === 0 &&
                        tier.minLifetimeSpend === 0 &&
                        'Everyone starts here'}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {tier.benefits.map((benefit) => (
                        <div
                          key={benefit}
                          className="flex items-start gap-2"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                          <p className="text-sm text-slate-700">{benefit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verified vs Trusted */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#E07A3A]" />
              <h2 className="text-base font-bold text-slate-900">
                Verified vs Trusted
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <strong>Verified</strong> (
              {thresholds?.verifiedMinOrders ?? 5}+ orders) is a status
              milestone — thanks for being a regular customer, but the service
              fee stays at {baseMarkup}%.{' '}
              <strong>Trusted</strong> (
              {thresholds?.trustedMinOrders ?? 20}+ orders) is when fee
              discounts kick in:{' '}
              {baseMarkup - (thresholds?.trustedDiscountPercentage ?? 5)}%
              service fee (
              {thresholds?.trustedDiscountPercentage ?? 5} percentage points
              off).
            </p>
          </div>

          {/* Good to know */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <h2 className="mb-3 text-base font-bold text-slate-600">
              Good to know
            </h2>
            <div className="space-y-2.5">
              {[
                'Loyalty savings apply to the service fee only, not delivery.',
                'Delivery fees follow package weight — see How delivery pricing works.',
                'Admins can manually adjust tiers in exceptional cases.',
                'WhatsApp orders use the same tiers and fees as the web app.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <p className="text-sm text-slate-500">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href={backHref}
              className="inline-flex rounded-full bg-[#1E1145] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a1a5e]"
            >
              Back to my account
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
