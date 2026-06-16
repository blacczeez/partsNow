'use client';

import { useState, useEffect, useCallback } from 'react';

interface RunnerSlaStats {
  total_completed: number;
  total_breached: number;
  breach_rate: number;
  avg_sourcing_seconds: number;
}

interface RunnerDetail {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  float: {
    balance: number;
    daily_limit: number;
    last_topped_up: string | null;
  } | null;
  currentShift: {
    id: string;
    started_at: string;
    orders_completed: number;
    total_sourced: number;
    commission_earned: number;
  } | null;
  recentShifts: Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    orders_completed: number;
    commission_earned: number;
    is_reconciled: boolean;
    discrepancy_amount: number;
  }>;
  recentAssignments: Array<{
    order_id: string;
    status: string;
    assigned_at: string;
    completed_at: string | null;
  }>;
  slaStats: RunnerSlaStats;
}

export function useAdminRunnerDetail(runnerId: string | null) {
  const [runner, setRunner] = useState<RunnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(runnerId));
  const [prevRunnerId, setPrevRunnerId] = useState(runnerId);
  const [actionLoading, setActionLoading] = useState(false);

  if (runnerId !== prevRunnerId) {
    setPrevRunnerId(runnerId);
    setIsLoading(Boolean(runnerId));
    if (!runnerId) {
      setRunner(null);
    }
  }

  useEffect(() => {
    if (!runnerId) return;

    let cancelled = false;

    async function loadRunner() {
      try {
        const res = await fetch(`/api/admin/runners/${runnerId}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setRunner(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRunner();

    return () => {
      cancelled = true;
    };
  }, [runnerId]);

  const refresh = useCallback(async () => {
    if (!runnerId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/runners/${runnerId}`);
      if (res.ok) {
        const data = await res.json();
        setRunner(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [runnerId]);

  const topUpFloat = async (amount: number) => {
    if (!runnerId) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/runners/${runnerId}/float`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { runner, isLoading, actionLoading, topUpFloat, refresh };
}
