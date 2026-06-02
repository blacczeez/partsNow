'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable } from '@/components/admin/data-table';
import { formatCurrency } from '@/lib/utils/format';

interface AnalyticsData {
  totalOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  avgDeliveryTime: number;
  successRate: number;
  topRunners: Array<{ name: string; orders_completed: number; commission: number }>;
  topVendors: Array<{ name: string; reliability_score: number; total_orders: number }>;
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async (p: 'week' | 'month') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const runnerColumns = [
    {
      header: 'Runner',
      render: (row: AnalyticsData['topRunners'][0]) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: 'Orders Completed',
      render: (row: AnalyticsData['topRunners'][0]) => row.orders_completed,
    },
    {
      header: 'Commission',
      render: (row: AnalyticsData['topRunners'][0]) => formatCurrency(row.commission),
    },
  ];

  const vendorColumns = [
    {
      header: 'Vendor',
      render: (row: AnalyticsData['topVendors'][0]) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: 'Reliability',
      render: (row: AnalyticsData['topVendors'][0]) => `${row.reliability_score}%`,
    },
    {
      header: 'Orders Supplied',
      render: (row: AnalyticsData['topVendors'][0]) => row.total_orders,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <div className="flex overflow-hidden rounded-button border border-slate-300">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${period === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setPeriod('week')}
          >
            This Week
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${period === 'month' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-slate-100" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Package} label="Total Orders" value={data.totalOrders} />
            <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
            <StatCard icon={Clock} label="Avg Delivery Time" value={data.avgDeliveryTime > 0 ? `${data.avgDeliveryTime}m` : 'N/A'} />
            <StatCard icon={TrendingUp} label="Success Rate" value={data.successRate > 0 ? `${data.successRate}%` : 'N/A'} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Top Runners</h2>
              <DataTable
                columns={runnerColumns}
                data={data.topRunners}
                emptyMessage="No runner data for this period"
              />
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Top Vendors</h2>
              <DataTable
                columns={vendorColumns}
                data={data.topVendors}
                emptyMessage="No vendor data for this period"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
