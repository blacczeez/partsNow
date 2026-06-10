'use client';

import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

export function MarketPriceNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">Market prices may differ from estimates</p>
        <p className="mt-1 text-amber-900/90">
          Catalog prices are guides. If the part costs more at Ladipo/ASPAMDA, we will
          notify you before delivery. You can pay the difference to continue, or cancel
          for a full refund — we never charge you more without your approval.
        </p>
      </div>
    </div>
  );
}

interface PriceChangeBannerProps {
  orderNumber: string;
  originalTotal: number;
  revisedTotal: number;
  topUpAmount: number;
  paymentMethod: string;
  walletBalance?: number;
  isSubmitting: boolean;
  onAccept: () => void;
  onDiscard: () => void;
}

export function PriceChangeBanner({
  orderNumber,
  originalTotal,
  revisedTotal,
  topUpAmount,
  paymentMethod,
  walletBalance,
  isSubmitting,
  onAccept,
  onDiscard,
}: PriceChangeBannerProps) {
  const walletShort =
    paymentMethod === 'wallet' &&
    walletBalance != null &&
    walletBalance < topUpAmount;

  return (
    <div className="rounded-card border border-warning/40 bg-warning-light p-4">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <h3 className="font-semibold text-slate-900">Price update required</h3>
          <p className="mt-1 text-sm text-slate-600">
            The market price for part(s) in order {orderNumber} is higher than our
            estimate. Choose how to proceed.
          </p>
        </div>
      </div>

      <dl className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Amount you paid / quoted</dt>
          <dd className="font-medium">{formatCurrency(originalTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Updated total (market price)</dt>
          <dd className="font-medium">{formatCurrency(revisedTotal)}</dd>
        </div>
        <div className="flex justify-between border-t border-warning/20 pt-1 font-semibold">
          <dt>Additional payment</dt>
          <dd className="text-warning">{formatCurrency(topUpAmount)}</dd>
        </div>
      </dl>

      {walletShort && (
        <p className="mb-3 text-sm text-error">
          Wallet balance ({formatCurrency(walletBalance!)}) is less than the additional
          amount. Top up your wallet or pay by card when you continue.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          disabled={isSubmitting}
          className="flex-1 rounded-button bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {topUpAmount > 0 ? `Pay ${formatCurrency(topUpAmount)} & continue` : 'Continue order'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSubmitting}
          className="flex-1 rounded-button border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel & full refund
        </button>
      </div>
    </div>
  );
}
