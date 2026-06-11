'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import type { DeliveryWeightTier } from '@/lib/types/delivery';

const VEHICLE_OPTIONS = [
  { value: 'bike', label: 'Bike' },
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van' },
  { value: 'partner', label: 'Partner dispatch' },
];

const emptyTier = (sortOrder: number): DeliveryWeightTier => ({
  id: `tier-${sortOrder}`,
  label: 'New tier',
  min_kg: 0,
  max_kg: null,
  delivery_fee: 1500,
  vehicle_type: 'bike',
  express_allowed: true,
  promise_minutes: 45,
  sort_order: sortOrder,
  is_active: true,
});

export default function AdminDeliverySettingsPage() {
  const [tiers, setTiers] = useState<DeliveryWeightTier[]>([]);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('50000');
  const [freeDeliveryEligibleTiers, setFreeDeliveryEligibleTiers] = useState<string[]>([
    'light',
    'medium',
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/delivery-tiers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTiers(data.tiers ?? []);
      if (data.freeDeliveryThreshold != null) {
        setFreeDeliveryThreshold(String(data.freeDeliveryThreshold));
      }
      if (Array.isArray(data.freeDeliveryEligibleTiers)) {
        setFreeDeliveryEligibleTiers(data.freeDeliveryEligibleTiers);
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to load delivery settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateTier(index: number, patch: Partial<DeliveryWeightTier>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  }

  function toggleEligibleTier(tierId: string) {
    setFreeDeliveryEligibleTiers((prev) =>
      prev.includes(tierId) ? prev.filter((id) => id !== tierId) : [...prev, tierId]
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/delivery-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers,
          freeDeliveryEligibleTiers,
          freeDeliveryThreshold: parseFloat(freeDeliveryThreshold),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast('success', 'Delivery settings saved');
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/settings" className="rounded-button p-2 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery tiers</h1>
          <p className="text-sm text-slate-500">
            Lagos weight-based delivery fees and vehicle routing
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-card border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="font-semibold text-slate-900">Free delivery rules</h2>
        <Input
          label="Free delivery threshold (NGN parts subtotal)"
          type="number"
          value={freeDeliveryThreshold}
          onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Eligible tiers (free delivery applies only on these tiers)
          </p>
          <div className="flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => toggleEligibleTier(tier.id)}
                className={`rounded-pill px-3 py-1 text-sm border ${
                  freeDeliveryEligibleTiers.includes(tier.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tiers.map((tier, index) => (
          <div
            key={`${tier.id}-${index}`}
            className="rounded-card border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Tier {index + 1}</h3>
              <button
                type="button"
                onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                className="text-slate-400 hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="ID (slug)"
                value={tier.id}
                onChange={(e) => updateTier(index, { id: e.target.value })}
              />
              <Input
                label="Label"
                value={tier.label}
                onChange={(e) => updateTier(index, { label: e.target.value })}
              />
              <Input
                label="Min kg"
                type="number"
                value={String(tier.min_kg)}
                onChange={(e) => updateTier(index, { min_kg: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Max kg (empty = unlimited)"
                type="number"
                value={tier.max_kg ?? ''}
                onChange={(e) =>
                  updateTier(index, {
                    max_kg: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
              <Input
                label="Delivery fee (NGN)"
                type="number"
                value={String(tier.delivery_fee)}
                onChange={(e) =>
                  updateTier(index, { delivery_fee: parseFloat(e.target.value) || 0 })
                }
              />
              <Input
                label="Promise (minutes)"
                type="number"
                value={String(tier.promise_minutes)}
                onChange={(e) =>
                  updateTier(index, {
                    promise_minutes: parseInt(e.target.value, 10) || 45,
                  })
                }
              />
              <Select
                label="Vehicle type"
                value={tier.vehicle_type}
                onChange={(e) =>
                  updateTier(index, {
                    vehicle_type: e.target.value as DeliveryWeightTier['vehicle_type'],
                  })
                }
              >
                {VEHICLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Sort order"
                type="number"
                value={String(tier.sort_order)}
                onChange={(e) =>
                  updateTier(index, { sort_order: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={tier.express_allowed}
                onChange={(e) => updateTier(index, { express_allowed: e.target.checked })}
              />
              Express delivery allowed
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={tier.is_active}
                onChange={(e) => updateTier(index, { is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => setTiers((prev) => [...prev, emptyTier(prev.length + 1)])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add tier
        </Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          Save delivery settings
        </Button>
      </div>
    </div>
  );
}
