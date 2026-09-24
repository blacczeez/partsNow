'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Scale, Truck, MapPin, ArrowLeft, Package, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { formatCurrency } from '@/lib/utils/format';
import type { DeliveryWeightTier } from '@/lib/types/delivery';

interface DeliveryConfigResponse {
  tiers: DeliveryWeightTier[];
  freeDeliveryThreshold: number;
  freeDeliveryEligibleTiers: string[];
}

export default function HowDeliveryWorksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <HowDeliveryWorksContent />
    </Suspense>
  );
}

function HowDeliveryWorksContent() {
  const [config, setConfig] = useState<DeliveryConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/delivery/config')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load delivery info');
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="px-4 pb-12 pt-4 lg:px-0">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Delivery Pricing' },
        ]}
      />

      {/* Back + title */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <h1 className="font-marketing-display text-xl font-bold text-slate-900">
          How delivery pricing works
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : config ? (
        <div className="space-y-6">
          {/* Hero explainer */}
          <div className="rounded-2xl bg-[#1E1145] px-6 py-8 text-white">
            <Scale className="h-8 w-8 text-[#E07A3A]" />
            <h2 className="font-marketing-display mt-3 text-lg font-bold">Based on package weight</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Delivery fees are calculated from the total weight of your order.
              Each part&apos;s weight is multiplied by quantity, then summed. We use
              your address to confirm you&apos;re in our Lagos service area.
            </p>
            <div className="mt-4 rounded-lg bg-white/10 px-4 py-2.5">
              <p className="text-xs text-slate-300">Formula</p>
              <p className="mt-0.5 font-mono text-sm">
                total kg = Σ (part weight × qty)
              </p>
            </div>
          </div>

          {/* Weight tiers table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-marketing-display mb-4 text-base font-bold text-slate-900">
              Weight tiers & fees
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Tier
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Weight
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Fee
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Delivery
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {tier.label}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {tier.min_kg}–{tier.max_kg != null ? `${tier.max_kg} kg` : '∞'}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {formatCurrency(tier.delivery_fee)}
                      </td>
                      <td className="py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          {tier.express_allowed ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Express
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Standard
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            · {tier.vehicle_type}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Free delivery */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              <h2 className="font-marketing-display text-base font-bold text-green-900">Free delivery</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-green-800">
              Orders with a parts subtotal of{' '}
              <strong>{formatCurrency(config.freeDeliveryThreshold)}</strong> or more
              get free delivery on{' '}
              <strong>
                {config.freeDeliveryEligibleTiers
                  .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
                  .join(' and ')}
              </strong>{' '}
              tiers. Heavy and oversized orders still pay the tier fee even above
              the threshold.
            </p>
          </div>

          {/* Example */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#E07A3A]" />
              <h2 className="font-marketing-display text-base font-bold text-slate-900">Example</h2>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">3× brake pads at 2 kg each</span>
                  <span className="font-medium text-slate-900">6 kg total</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight tier</span>
                  <span className="font-medium text-slate-900">Light</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500">Delivery fee</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      config.tiers.find((t) => t.id === 'light')?.delivery_fee ?? 1500
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Or free if parts subtotal ≥ {formatCurrency(config.freeDeliveryThreshold)}
              </p>
            </div>
          </div>

          {/* Distance zones — coming */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h2 className="font-marketing-display text-base font-bold text-slate-600">
                Distance zones
              </h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                COMING SOON
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Zone surcharges for far mainland or island deliveries may be added
              later. Your tier will still be driven by weight first.
            </p>
          </div>

          {/* Key points */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-marketing-display mb-3 text-base font-bold text-slate-900">Key points</h2>
            <div className="space-y-3">
              {[
                'Delivery fees are based on weight, not distance',
                'Free delivery available on qualifying tiers and order amounts',
                'Heavy or oversized orders may require van delivery',
                'All prices include dispatch and rider fees',
              ].map((point) => (
                <div key={point} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm text-slate-600">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
