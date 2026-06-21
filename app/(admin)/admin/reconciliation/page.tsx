'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminDateRangeFilter } from '@/components/admin/admin-date-range-filter';
import { FinancialStatCards } from '@/components/admin/financial-stat-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import {
  adminDateRangeToSearchParams,
  getDefaultAdminDateRange,
  type AdminDateRangeValue,
} from '@/lib/utils/admin-date-range';
import type { AdminFinancialTotals } from '@/lib/services/admin-financials';
import { ADMIN_FINANCIAL_DESCRIPTIONS } from '@/lib/services/admin-financials';

interface ReconciliationShift {
  id: string;
  runner_name: string;
  started_at: string;
  ended_at: string | null;
  orders_completed: number;
  total_sourced: number;
  commission_earned: number;
  starting_float: number;
  ending_float: number | null;
  discrepancy_amount: number | null;
  is_reconciled: boolean;
}

interface ReconciliationSummary {
  totalShifts: number;
  totalSourced: number;
  totalCommission: number;
  totalDiscrepancy: number;
  unreconciledCount: number;
}

interface ReconciliationData {
  shifts: ReconciliationShift[];
  summary: ReconciliationSummary;
  financials: AdminFinancialTotals;
  financialDescriptions: typeof ADMIN_FINANCIAL_DESCRIPTIONS;
  dateRangeLabel: string;
}

const columns = [
  {
    header: 'Runner',
    render: (row: ReconciliationShift) => (
      <span className="font-medium text-slate-900">{row.runner_name}</span>
    ),
  },
  {
    header: 'Shift started',
    render: (row: ReconciliationShift) => (
      <span className="text-slate-500">
        {new Date(row.started_at).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
        {row.ended_at
          ? ` – ${new Date(row.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : ' (active)'}
      </span>
    ),
  },
  {
    header: 'Orders',
    render: (row: ReconciliationShift) => row.orders_completed,
  },
  {
    header: 'Sourced',
    render: (row: ReconciliationShift) => formatCurrency(row.total_sourced),
  },
  {
    header: 'Commission',
    render: (row: ReconciliationShift) => formatCurrency(row.commission_earned),
  },
  {
    header: 'Discrepancy',
    render: (row: ReconciliationShift) => {
      const amount = row.discrepancy_amount ?? 0;
      return (
        <span className={amount !== 0 ? 'font-medium text-error' : 'text-slate-500'}>
          {formatCurrency(amount)}
        </span>
      );
    },
  },
  {
    header: 'Status',
    render: (row: ReconciliationShift) => (
      <Badge variant={row.is_reconciled ? 'success' : 'warning'}>
        {row.is_reconciled ? 'Reconciled' : 'Pending'}
      </Badge>
    ),
  },
];

function ReconciliationResults({
  dateRange,
  refreshKey,
}: {
  dateRange: AdminDateRangeValue;
  refreshKey: number;
}) {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const params = adminDateRangeToSearchParams(dateRange);

    fetch(`/api/admin/reconciliation?${params.toString()}`)
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to load reconciliation');
        return result as ReconciliationData;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reconciliation');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, refreshKey]);

  if (error) {
    return (
      <p className="mb-4 rounded-card border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
        {error}
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-card bg-slate-100" />
        <div className="h-64 animate-pulse rounded-card bg-slate-100" />
      </div>
    );
  }

  const { summary } = data;

  return (
    <>
      <p className="mb-4 text-sm text-slate-500">Showing data for {data.dateRangeLabel}</p>

      <FinancialStatCards
        financials={data.financials}
        descriptions={data.financialDescriptions}
        className="mb-6"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Shifts', value: summary.totalShifts },
          { label: 'Total sourced', value: formatCurrency(summary.totalSourced) },
          { label: 'Shift commission', value: formatCurrency(summary.totalCommission) },
          { label: 'Discrepancy', value: formatCurrency(summary.totalDiscrepancy) },
          { label: 'Unreconciled', value: summary.unreconciledCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-card border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-lg font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data.shifts}
        emptyMessage="No runner shifts for this period"
      />
    </>
  );
}

export default function AdminReconciliationPage() {
  const [dateRange, setDateRange] = useState<AdminDateRangeValue>(() =>
    getDefaultAdminDateRange('today')
  );
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Reconciliation"
        description="Runner shift totals and platform financial accumulation for the selected period."
        filters={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
            <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
              Refresh
            </Button>
          </div>
        }
      />

      <ReconciliationResults
        key={`${dateRange.preset}-${dateRange.from}-${dateRange.to}-${refreshKey}`}
        dateRange={dateRange}
        refreshKey={refreshKey}
      />
    </div>
  );
}
