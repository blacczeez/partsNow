'use client';

import { Package, DollarSign, AlertTriangle, Users, Bike, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { NeedsAttentionPanel } from '@/components/admin/needs-attention-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAdminDashboard } from '@/lib/hooks/use-admin-dashboard';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import type { OrderStatus } from '@/lib/types/database';

export default function AdminDashboardPage() {
  const { stats, isLoading } = useAdminDashboard();

  if (isLoading || !stats) {
    return <AdminPageSkeleton statCards={4} tableColumns={5} />;
  }

  const recentOrderColumns = [
    {
      header: 'Order',
      render: (row: (typeof stats.recentOrders)[0]) => (
        <span className="font-medium text-slate-900">{row.order_number}</span>
      ),
    },
    {
      header: 'Customer',
      render: (row: (typeof stats.recentOrders)[0]) => (
        <span>{(row as { customer_name?: string }).customer_name ?? '—'}</span>
      ),
    },
    {
      header: 'Status',
      render: (row: (typeof stats.recentOrders)[0]) => (
        <StatusBadge status={row.status as OrderStatus} />
      ),
    },
    {
      header: 'Total',
      render: (row: (typeof stats.recentOrders)[0]) => formatCurrency(row.total),
    },
    {
      header: 'Time',
      render: (row: (typeof stats.recentOrders)[0]) => (
        <span className="text-slate-500">{formatRelativeTime(row.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <AdminPageHeader title="Dashboard" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Today's Orders"
          value={stats.todayOrderCount}
        />
        <StatCard
          icon={DollarSign}
          label="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Orders"
          value={stats.totalActive}
          subtitle={Object.entries(stats.activeByStatus)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
        />
        <StatCard
          icon={AlertTriangle}
          label="SLA Breaches"
          value={stats.slaBreachCount}
          className={stats.slaBreachCount > 0 ? 'border-error/30 bg-error-light' : ''}
        />
      </div>

      {/* Active Staff */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-card border border-slate-200 bg-white px-4 py-3">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm text-slate-500">Runners on shift:</span>
          <span className="font-semibold text-slate-900">{stats.activeRunnerCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-card border border-slate-200 bg-white px-4 py-3">
          <Bike className="h-5 w-5 text-primary" />
          <span className="text-sm text-slate-500">Active riders:</span>
          <span className="font-semibold text-slate-900">{stats.activeRiderCount}</span>
        </div>
      </div>

      <NeedsAttentionPanel attention={stats.attention} />

      {/* Recent Orders */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Orders</h2>
        <DataTable columns={recentOrderColumns} data={stats.recentOrders} />
      </div>
    </div>
  );
}
