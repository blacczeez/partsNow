'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConfigEntry {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export function useAdminSettings() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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

  return { config, isLoading, actionLoading, updateConfig, refresh: fetchConfig };
}
