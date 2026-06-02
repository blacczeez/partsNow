'use client';

import { useState, useEffect, useCallback } from 'react';

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
}

export function useAdminRunnerDetail(runnerId: string | null) {
  const [runner, setRunner] = useState<RunnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRunner = useCallback(async () => {
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

  useEffect(() => {
    fetchRunner();
  }, [fetchRunner]);

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
        await fetchRunner();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { runner, isLoading, actionLoading, topUpFloat, refresh: fetchRunner };
}
