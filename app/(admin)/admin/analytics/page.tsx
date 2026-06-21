'use client';

import { useEffect, useState } from 'react';
import { Package, Clock, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { AdminDateRangeFilter } from '@/components/admin/admin-date-range-filter';
import { FinancialStatCards } from '@/components/admin/financial-stat-cards';
import { formatCurrency } from '@/lib/utils/format';
import {
  adminDateRangeToSearchParams,
  getDefaultAdminDateRange,
  type AdminDateRangeValue,
} from '@/lib/utils/admin-date-range';
import type { AdminFinancialTotals } from '@/lib/services/admin-financials';
import { ADMIN_FINANCIAL_DESCRIPTIONS } from '@/lib/services/admin-financials';

interface AnalyticsData {
  totalOrders: number;
  deliveredOrders: number;
  avgDeliveryTime: number;
  successRate: number;
  financials: AdminFinancialTotals;
  financialDescriptions: typeof ADMIN_FINANCIAL_DESCRIPTIONS;
  dateRangeLabel: string;
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

function AnalyticsDashboard({ dateRange }: { dateRange: AdminDateRangeValue }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const params = adminDateRangeToSearchParams(dateRange);

    fetch(`/api/admin/analytics?${params.toString()}`)
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to load analytics');
        return result as AnalyticsData;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  if (isLoading) {
    return <AdminPageSkeleton statCards={6} tableColumns={3} />;
  }

  if (error || !data) {
    return (
      <p className="rounded-card border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
        {error || 'Failed to load analytics'}
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-500">Showing data for {data.dateRangeLabel}</p>

      <FinancialStatCards
        financials={data.financials}
        descriptions={data.financialDescriptions}
        className="mb-6"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Package} label="Total Orders" value={data.totalOrders} />
        <StatCard
          icon={Clock}
          label="Avg Delivery Time"
          value={data.avgDeliveryTime > 0 ? `${data.avgDeliveryTime}m` : 'N/A'}
        />
        <StatCard
          icon={TrendingUp}
          label="Success Rate"
          value={data.successRate > 0 ? `${data.successRate}%` : 'N/A'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          <p className="mb-2 text-xs text-slate-400">Lifetime reliability scores (not filtered by date).</p>
          <DataTable
            columns={vendorColumns}
            data={data.topVendors}
            emptyMessage="No vendor data"
          />
        </div>
      </div>
    </>
  );
}

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState<AdminDateRangeValue>(() =>
    getDefaultAdminDateRange('last7')
  );

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Analytics"
        description="Platform financials and operational metrics for the selected period."
        filters={<AdminDateRangeFilter value={dateRange} onChange={setDateRange} />}
      />

      <AnalyticsDashboard key={`${dateRange.preset}-${dateRange.from}-${dateRange.to}`} dateRange={dateRange} />
    </div>
  );
}
