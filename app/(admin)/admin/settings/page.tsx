'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminSettings } from '@/lib/hooks/use-admin-settings';
import { toast } from '@/components/ui/toast';

interface ConfigGroup {
  label: string;
  keys: Array<{
    key: string;
    label: string;
    type: 'number' | 'boolean' | 'string';
    description?: string;
  }>;
}

const CONFIG_GROUPS: ConfigGroup[] = [
  {
    label: 'Business Model',
    keys: [
      { key: 'default_markup_percentage', label: 'Default Markup %', type: 'number' },
      { key: 'free_delivery_threshold', label: 'Free Delivery Threshold (NGN)', type: 'number' },
      { key: 'standard_delivery_fee', label: 'Standard Delivery Fee (NGN)', type: 'number' },
    ],
  },
  {
    label: 'Delivery',
    keys: [
      { key: 'express_delivery_radius_km', label: 'Express Delivery Radius (km)', type: 'number' },
      { key: 'express_delivery_promise_minutes', label: 'Express Promise (minutes)', type: 'number' },
      { key: 'standard_delivery_promise_minutes', label: 'Standard Promise (minutes)', type: 'number' },
    ],
  },
  {
    label: 'Runner Settings',
    keys: [
      { key: 'runner_accept_timeout_minutes', label: 'Accept Timeout (minutes)', type: 'number' },
      { key: 'runner_max_concurrent_orders', label: 'Max Concurrent Orders', type: 'number' },
      { key: 'runner_daily_float_limit', label: 'Daily Float Limit (NGN)', type: 'number' },
      { key: 'runner_commission_per_order', label: 'Commission Per Order (NGN)', type: 'number' },
    ],
  },
  {
    label: 'Loyalty Tiers',
    keys: [
      {
        key: 'loyalty_verified_min_orders',
        label: 'Verified — min delivered orders',
        type: 'number',
      },
      {
        key: 'loyalty_trusted_min_orders',
        label: 'Trusted — min delivered orders',
        type: 'number',
      },
      {
        key: 'loyalty_partner_min_orders',
        label: 'Partner — min delivered orders',
        type: 'number',
      },
      {
        key: 'loyalty_partner_min_lifetime_spend',
        label: 'Partner — min lifetime spend (NGN)',
        type: 'number',
      },
      {
        key: 'loyalty_trusted_discount_percentage',
        label: 'Trusted — markup discount (percentage points)',
        type: 'number',
        description: 'Points subtracted from default markup (e.g. 5 → 15% becomes 10%)',
      },
      {
        key: 'loyalty_partner_discount_percentage',
        label: 'Partner — markup discount (percentage points)',
        type: 'number',
        description: 'Points subtracted from default markup (e.g. 8 → 15% becomes 7%)',
      },
    ],
  },
  {
    label: 'Features',
    keys: [
      { key: 'feature_car_owner_web_app', label: 'Car Owner Web App', type: 'boolean' },
      { key: 'feature_mechanic_web_app', label: 'Mechanic Web App', type: 'boolean' },
      { key: 'feature_credit_system', label: 'Credit System', type: 'boolean' },
      { key: 'feature_loyalty_discounts', label: 'Loyalty Discounts', type: 'boolean' },
      { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean' },
    ],
  },
];

export default function AdminSettingsPage() {
  const { config, isLoading, actionLoading, updateConfig } = useAdminSettings();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  // Populate local values from config
  useEffect(() => {
    const values: Record<string, string> = {};
    config.forEach((c) => {
      values[c.key] = String(c.value ?? '');
    });
    setLocalValues(values);
    setDirtyKeys(new Set());
  }, [config]);

  const handleChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  };

  const handleSaveGroup = async (keys: string[]) => {
    const keysToSave = keys.filter((k) => dirtyKeys.has(k));
    if (keysToSave.length === 0) {
      toast('info', 'No changes to save');
      return;
    }

    let allSuccess = true;
    for (const key of keysToSave) {
      const groupKey = CONFIG_GROUPS.flatMap((g) => g.keys).find((k) => k.key === key);
      let value: unknown = localValues[key];
      if (groupKey?.type === 'number') {
        value = parseFloat(localValues[key]);
      } else if (groupKey?.type === 'boolean') {
        value = localValues[key] === 'true';
      }

      const success = await updateConfig(key, value);
      if (!success) allSuccess = false;
    }

    if (allSuccess) {
      toast('success', 'Settings saved');
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        keysToSave.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      toast('error', 'Failed to save some settings');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Settings</h1>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Settings</h1>

      <div className="mb-6 rounded-card border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Weight-based delivery</h2>
            <p className="text-sm text-slate-500">
              Configure Lagos delivery tiers, fees, and free-delivery rules
            </p>
          </div>
          <Link href="/admin/settings/delivery">
            <Button variant="secondary" size="sm">
              Manage tiers
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {CONFIG_GROUPS.map((group) => {
          const groupKeys = group.keys.map((k) => k.key);
          const hasDirty = groupKeys.some((k) => dirtyKeys.has(k));

          return (
            <div key={group.label} className="rounded-card border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{group.label}</h2>
                <Button
                  size="sm"
                  disabled={!hasDirty}
                  isLoading={actionLoading}
                  onClick={() => handleSaveGroup(groupKeys)}
                >
                  Save
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.keys.map((field) => {
                  if (field.type === 'boolean') {
                    return (
                      <label key={field.key} className="flex items-center gap-3 rounded-button bg-slate-50 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={localValues[field.key] === 'true'}
                          onChange={(e) => handleChange(field.key, String(e.target.checked))}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700">{field.label}</span>
                      </label>
                    );
                  }

                  return (
                    <Input
                      key={field.key}
                      label={field.label}
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={localValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
