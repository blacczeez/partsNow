'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ADMIN_SETTINGS_GROUPS,
  type AdminSettingsGroup,
} from '@/lib/constants/admin-settings';
type ConfigValueSource = 'database' | 'env';

export type { AdminSettingsGroup };

interface EffectiveSettingMeta {
  key: string;
  value: unknown;
  source: ConfigValueSource;
  envDefault: unknown;
}

interface AdminSettingsResponse {
  groups: AdminSettingsGroup[];
  effectiveByKey: Record<string, EffectiveSettingMeta>;
}

export function useAdminSettings() {
  const [groups, setGroups] = useState<AdminSettingsGroup[]>(ADMIN_SETTINGS_GROUPS);
  const [effectiveByKey, setEffectiveByKey] = useState<
    Record<string, EffectiveSettingMeta> | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = (await res.json()) as AdminSettingsResponse;
        setGroups(data.groups ?? ADMIN_SETTINGS_GROUPS);
        setEffectiveByKey(data.effectiveByKey ?? {});
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as AdminSettingsResponse;
        if (!cancelled) {
          setGroups(data.groups ?? ADMIN_SETTINGS_GROUPS);
          setEffectiveByKey(data.effectiveByKey ?? {});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateConfig = async (key: string, value: unknown) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        await fetchConfig();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    groups,
    effectiveByKey,
    isLoading,
    actionLoading,
    updateConfig,
    refresh: fetchConfig,
  };
}
