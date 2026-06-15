'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useUser } from '@/lib/hooks/use-user';
import { LoyaltyProgressCard } from '@/components/loyalty/loyalty-progress-card';
import { LoyaltyTierBadge } from '@/components/loyalty/loyalty-tier-badge';
import type { LoyaltyTier } from '@/lib/types/database';
import type { LoyaltyProgress } from '@/lib/utils/loyalty';
import type { LoyaltyTierDefinition } from '@/lib/constants/loyalty';

interface LoyaltyApiResponse {
  enabled: boolean;
  tiers: LoyaltyTierDefinition[];
  progress: LoyaltyProgress | null;
}

export default function LoyaltyPage() {
  const { user, isLoading: userLoading } = useUser();
  const [data, setData] = useState<LoyaltyApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/loyalty')
      .then((res) => res.json())
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (userLoading || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-500">
        Please sign in to view loyalty benefits.
      </div>
    );
  }

  const tier = user.loyalty_tier as LoyaltyTier;

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:top-[6.5rem]">
        <Link href="/account" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Loyalty</h1>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-600">
          Earn better rates as you complete more delivered orders. Tiers update automatically
          after each successful delivery.
        </p>

        <Link
          href="/how-loyalty-works?from=loyalty"
          className="block rounded-card border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
        >
          How loyalty works — full rules & examples
        </Link>

        {data?.progress && (
          <LoyaltyProgressCard
            progress={data.progress}
            totalOrders={user.total_orders}
            lifetimeSpend={user.lifetime_spend}
          />
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">All tiers</h2>
          {(data?.tiers ?? []).map((tierDef) => {
            const isCurrent = tierDef.tier === tier;
            return (
              <div
                key={tierDef.tier}
                className={`rounded-card border p-4 ${
                  isCurrent ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <LoyaltyTierBadge tier={tierDef.tier} />
                  {isCurrent && (
                    <span className="text-xs font-medium text-primary">Your tier</span>
                  )}
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  {tierDef.minOrders > 0 && `${tierDef.minOrders}+ delivered orders`}
                  {tierDef.minLifetimeSpend > 0 &&
                    ` · ${tierDef.minLifetimeSpend.toLocaleString('en-NG')} ₦+ lifetime spend`}
                  {tierDef.minOrders === 0 && tierDef.minLifetimeSpend === 0 && 'Starting tier'}
                </p>
                <ul className="space-y-1">
                  {tierDef.benefits.map((benefit) => (
                    <li key={benefit} className="text-sm text-slate-700">
                      · {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {!data?.enabled && (
          <p className="text-xs text-amber-700">
            Loyalty discounts are temporarily disabled platform-wide.
          </p>
        )}
      </div>
    </div>
  );
}
