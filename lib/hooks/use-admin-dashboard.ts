'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminAttentionInbox } from '@/lib/services/admin-attention';

interface DashboardStats {
  todayOrderCount: number;
  todayRevenue: number;
  totalActive: number;
  activeByStatus: Record<string, number>;
  slaBreachCount: number;
  priceReviewPendingCount: number;
  attention: AdminAttentionInbox;
  activeRunnerCount: number;
  activeRiderCount: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    payment_status: string;
    created_at: string;
    customer_name?: string;
  }>;
}

const REALTIME_DEBOUNCE_MS = 3000;

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchStats();
    }, REALTIME_DEBOUNCE_MS);
  }, [fetchStats]);

  useEffect(() => {
    void fetchStats();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchStats]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scheduleRefresh]);

  return { stats, isLoading, refresh: fetchStats };
}
