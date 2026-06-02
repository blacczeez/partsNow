'use client';

import { Package, DollarSign, AlertTriangle, Users, Bike, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useAdminDashboard } from '@/lib/hooks/use-admin-dashboard';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import type { OrderStatus } from '@/lib/types/database';

export default function AdminDashboardPage() {
  const { stats, isLoading } = useAdminDashboard();

  if (isLoading || !stats) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-slate-100" />
          ))}
        </div>
      </div>
    );
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
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>

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
      <div className="mt-4 flex gap-4">
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

      {/* SLA Breaches */}
      {stats.slaBreaches.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Needs Attention
            <Badge variant="error" className="ml-2">{stats.slaBreachCount}</Badge>
          </h2>
          <div className="space-y-2">
            {stats.slaBreaches.map((breach) => (
              <div
                key={breach.id}
                className="flex items-center justify-between rounded-card border border-error/20 bg-error-light px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-900">{breach.order_number}</span>
                  <StatusBadge status={breach.status as OrderStatus} className="ml-2" />
                </div>
                <span className="text-sm text-error">
                  {Math.round(
                    (Date.now() - new Date(breach.created_at).getTime()) / 60000
                  )}
                  m elapsed (SLA: {breach.promised_delivery_minutes}m)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Orders</h2>
        <DataTable columns={recentOrderColumns} data={stats.recentOrders} />
      </div>
    </div>
  );
}
