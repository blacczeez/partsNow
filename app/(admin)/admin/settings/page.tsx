'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminSettings } from '@/lib/hooks/use-admin-settings';
import { DELIVERY_TIERS_CARD } from '@/lib/constants/admin-settings';
import { toast } from '@/components/ui/toast';
import type { AdminSettingsGroup } from '@/lib/hooks/use-admin-settings';

type EffectiveByKey = NonNullable<
  ReturnType<typeof useAdminSettings>['effectiveByKey']
>;

function formatSettingValue(value: unknown, type: 'number' | 'boolean' | 'string'): string {
  if (type === 'boolean') return String(value === true);
  if (value == null) return '';
  return String(value);
}

function buildLocalValues(
  effectiveByKey: EffectiveByKey,
  groups: AdminSettingsGroup[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, setting] of Object.entries(effectiveByKey)) {
    const field = groups
      .flatMap((group) => group.keys)
      .find((item) => item.key === key);
    values[key] = formatSettingValue(setting.value, field?.type ?? 'string');
  }
  return values;
}

function getSettingsFormKey(effectiveByKey: EffectiveByKey): string {
  return Object.entries(effectiveByKey)
    .map(([key, meta]) => `${key}:${JSON.stringify(meta.value)}`)
    .sort()
    .join('|');
}

interface AdminSettingsFormProps {
  groups: AdminSettingsGroup[];
  effectiveByKey: EffectiveByKey;
  actionLoading: boolean;
  updateConfig: (key: string, value: unknown) => Promise<boolean>;
}

function AdminSettingsForm({
  groups,
  effectiveByKey,
  actionLoading,
  updateConfig,
}: AdminSettingsFormProps) {
  const [localValues, setLocalValues] = useState(() =>
    buildLocalValues(effectiveByKey, groups)
  );
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());

  const handleChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  };

  const handleSaveGroup = async (group: AdminSettingsGroup) => {
    const keysToSave = group.keys
      .map((field) => field.key)
      .filter((key) => dirtyKeys.has(key));

    if (keysToSave.length === 0) {
      toast('info', 'No changes to save');
      return;
    }

    let allSuccess = true;
    for (const key of keysToSave) {
      const field = group.keys.find((item) => item.key === key);
      let value: unknown = localValues[key];
      if (field?.type === 'number') {
        value = parseFloat(localValues[key]);
      } else if (field?.type === 'boolean') {
        value = localValues[key] === 'true';
      }

      const success = await updateConfig(key, value);
      if (!success) allSuccess = false;
    }

    if (allSuccess) {
      toast('success', 'Settings saved');
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        keysToSave.forEach((key) => next.delete(key));
        return next;
      });
    } else {
      toast('error', 'Failed to save some settings');
    }
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const hasDirty = group.keys.some((field) => dirtyKeys.has(field.key));

        return (
          <div
            key={group.id}
            className="rounded-card border border-slate-200 bg-white p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h2 className="text-lg font-semibold text-slate-900">
                  {group.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{group.description}</p>
              </div>
              <Button
                size="sm"
                disabled={!hasDirty}
                isLoading={actionLoading}
                onClick={() => handleSaveGroup(group)}
              >
                Save
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.keys.map((field) => {
                const meta = effectiveByKey[field.key];
                const sourceLabel =
                  meta?.source === 'database' ? 'Saved in admin' : 'Env default';

                if (field.type === 'boolean') {
                  return (
                    <label
                      key={field.key}
                      className="flex items-start gap-3 rounded-button border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={localValues[field.key] === 'true'}
                        onChange={(e) =>
                          handleChange(field.key, String(e.target.checked))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">
                          {field.label}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {field.description}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {sourceLabel}
                          {meta?.envDefault != null &&
                            meta.source === 'env' &&
                            ` · ${String(meta.envDefault)}`}
                        </span>
                      </span>
                    </label>
                  );
                }

                return (
                  <div key={field.key} className="space-y-1">
                    <Input
                      label={field.label}
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={localValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                    <p className="text-xs text-slate-500">{field.description}</p>
                    <p className="text-xs text-slate-400">
                      {sourceLabel}
                      {meta?.envDefault != null &&
                        meta.source === 'env' &&
                        ` · ${String(meta.envDefault)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { groups, effectiveByKey, isLoading, actionLoading, updateConfig } =
    useAdminSettings();

  if (isLoading || !effectiveByKey) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mb-6 text-sm text-slate-500">
          Platform configuration. Saved values in the database override environment
          defaults.
        </p>
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
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600">
        Configure pricing, delivery, runner operations, loyalty, and feature flags.
        Values you save here are the <strong>source of truth</strong> and take effect
        immediately. If a setting has never been saved, the app uses the environment
        default shown below each field.
      </p>

      <div className="mb-6 rounded-card border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {DELIVERY_TIERS_CARD.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {DELIVERY_TIERS_CARD.description}
            </p>
          </div>
          <Link href="/admin/settings/delivery">
            <Button variant="secondary" size="sm">
              Manage tiers
            </Button>
          </Link>
        </div>
      </div>

      <AdminSettingsForm
        key={getSettingsFormKey(effectiveByKey)}
        groups={groups}
        effectiveByKey={effectiveByKey}
        actionLoading={actionLoading}
        updateConfig={updateConfig}
      />
    </div>
  );
}
