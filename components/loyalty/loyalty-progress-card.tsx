'use client';

import { formatCurrency } from '@/lib/utils/format';
import { formatLoyaltyTier } from '@/lib/utils/loyalty';
import type { LoyaltyProgress } from '@/lib/utils/loyalty';
import { LoyaltyTierBadge } from './loyalty-tier-badge';

interface LoyaltyProgressCardProps {
  progress: LoyaltyProgress;
  totalOrders: number;
  lifetimeSpend: number;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-slate-100">
        <div
          className="h-full rounded-pill bg-primary transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function LoyaltyProgressCard({
  progress,
  totalOrders,
  lifetimeSpend,
}: LoyaltyProgressCardProps) {
  return (
    <div className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Current tier</p>
          <div className="mt-1 flex items-center gap-2">
            <LoyaltyTierBadge tier={progress.currentTier} />
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{totalOrders} delivered orders</p>
          <p>{formatCurrency(lifetimeSpend)} spent</p>
        </div>
      </div>

      {progress.nextTier ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Next: <strong>{formatLoyaltyTier(progress.nextTier)}</strong>
          </p>
          <ProgressBar
            value={progress.ordersProgress}
            label={`Orders (${totalOrders}/${progress.ordersTarget})`}
          />
          {progress.spendTarget != null && (
            <ProgressBar
              value={progress.spendProgress}
              label={`Lifetime spend (${formatCurrency(lifetimeSpend)} / ${formatCurrency(progress.spendTarget)})`}
            />
          )}
          <p className="text-xs text-slate-500">
            {progress.ordersRemaining != null && progress.ordersRemaining > 0 && (
              <>
                {progress.ordersRemaining} more delivered order
                {progress.ordersRemaining !== 1 ? 's' : ''}
              </>
            )}
            {progress.spendRemaining != null &&
              progress.spendRemaining > 0 &&
              progress.nextTier === 'partner' && (
                <>
                  {progress.ordersRemaining ? ' · ' : ''}
                  {formatCurrency(progress.spendRemaining)} more spend
                </>
              )}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          You&apos;re at our highest tier — thank you for being a PartsNow partner.
        </p>
      )}
    </div>
  );
}
