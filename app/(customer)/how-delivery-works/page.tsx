'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Scale, Truck, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { DeliveryWeightTier } from '@/lib/types/delivery';

interface DeliveryConfigResponse {
  tiers: DeliveryWeightTier[];
  freeDeliveryThreshold: number;
  freeDeliveryEligibleTiers: string[];
}

export default function HowDeliveryWorksPage() {
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
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">How delivery pricing works</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : config ? (
        <div className="space-y-6">
          <section className="rounded-card border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">Based on package weight</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Delivery fees in Lagos are calculated from the <strong>total weight</strong> of your
              order: each part&apos;s weight multiplied by quantity, then summed. Distance does not
              change your tier today — we only use your address to confirm you&apos;re in our Lagos
              service area.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Formula: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">total kg = Σ (part weight × qty)</code>
            </p>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-900">Weight tiers & fees</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Tier</th>
                    <th className="py-2 pr-3 font-medium">Weight</th>
                    <th className="py-2 pr-3 font-medium">Fee</th>
                    <th className="py-2 font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{tier.label}</td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {tier.min_kg}–{tier.max_kg != null ? `${tier.max_kg} kg` : '∞'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-900">
                        {formatCurrency(tier.delivery_fee)}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {tier.express_allowed ? 'Express' : 'Standard'} · {tier.vehicle_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">Free delivery</h2>
            </div>
            <p className="text-sm text-slate-600">
              Parts subtotal of {formatCurrency(config.freeDeliveryThreshold)} or more gets{' '}
              <strong>free delivery</strong> only on{' '}
              {config.freeDeliveryEligibleTiers
                .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
                .join(' and ')}{' '}
              tiers. Heavy and oversized orders still pay the tier fee even above the threshold.
            </p>
          </section>

          <section className="rounded-card border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-700">Distance zones (coming)</h2>
            </div>
            <p className="text-sm text-slate-500">
              Zone surcharges for far mainland or island deliveries may be added later. Your tier
              will still be driven by weight first.
            </p>
          </section>

          <section className="rounded-card border border-slate-200 bg-white p-4">
            <h2 className="mb-2 font-semibold text-slate-900">Example</h2>
            <p className="text-sm text-slate-600">
              3× brake pads at 2 kg each → <strong>6 kg total</strong> → Light tier →{' '}
              {formatCurrency(
                config.tiers.find((t) => t.id === 'light')?.delivery_fee ?? 1500
              )}{' '}
              delivery (or free if parts subtotal ≥{' '}
              {formatCurrency(config.freeDeliveryThreshold)}).
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
