'use client';

import { useEffect, useState } from 'react';
import { Package, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
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

function AnalyticsDashboard({ period }: { period: 'week' | 'month' }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/analytics?period=${period}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<AnalyticsData>;
      })
      .then((result) => {
        if (!cancelled && result) setData(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  if (isLoading || !data) {
    return <AdminPageSkeleton statCards={4} tableColumns={3} />;
  }

  return (
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
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Analytics"
        actions={
          <div className="flex overflow-hidden rounded-button border border-slate-300">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${period === 'week' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setPeriod('week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${period === 'month' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setPeriod('month')}
            >
              This Month
            </button>
          </div>
        }
      />

      <AnalyticsDashboard key={period} period={period} />
    </div>
  );
}
