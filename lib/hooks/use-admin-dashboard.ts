'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  todayOrderCount: number;
  todayRevenue: number;
  totalActive: number;
  activeByStatus: Record<string, number>;
  slaBreachCount: number;
  priceReviewPendingCount: number;
  slaBreaches: Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    promised_delivery_minutes: number;
  }>;
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

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to realtime order changes for live refresh
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats };
}
