'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminDateRangeFilter } from '@/components/admin/admin-date-range-filter';
import { FinancialStatCards } from '@/components/admin/financial-stat-cards';
import { ShiftReconciliationBadge } from '@/components/admin/shift-reconciliation-badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils/format';
import {
  adminDateRangeToSearchParams,
  getDefaultAdminDateRange,
  type AdminDateRangeValue,
} from '@/lib/utils/admin-date-range';
import {
  formatShiftDiscrepancyLabel,
  getShiftReconciliationStatus,
} from '@/lib/utils/shift-reconciliation';
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
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const params = adminDateRangeToSearchParams(dateRange);
    const res = await fetch(`/api/admin/reconciliation?${params.toString()}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to load reconciliation');
    return result as ReconciliationData;
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;

    loadData()
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
  }, [loadData, refreshKey]);

  const handleReconcile = async (shiftId: string) => {
    setReconcilingId(shiftId);
    try {
      const res = await fetch(
        `/api/admin/reconciliation/shifts/${shiftId}/reconcile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to reconcile shift');
      }

      setData((prev) => {
        if (!prev) return prev;
        const shift = prev.shifts.find((s) => s.id === shiftId);
        const wasPending = shift?.ended_at && !shift.is_reconciled;
        return {
          ...prev,
          shifts: prev.shifts.map((s) =>
            s.id === shiftId ? { ...s, is_reconciled: true } : s
          ),
          summary: wasPending
            ? {
                ...prev.summary,
                unreconciledCount: Math.max(0, prev.summary.unreconciledCount - 1),
              }
            : prev.summary,
        };
      });

      const refreshed = await loadData();
      setData(refreshed);
      toast('success', 'Shift marked as reconciled');
    } catch (err) {
      toast(
        'error',
        err instanceof Error ? err.message : 'Failed to reconcile shift'
      );
    } finally {
      setReconcilingId(null);
    }
  };

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

  const columns = [
    {
      header: 'Runner',
      render: (row: ReconciliationShift) => (
        <span className="font-medium text-slate-900">{row.runner_name}</span>
      ),
    },
    {
      header: 'Shift',
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
            : ''}
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
        const status = getShiftReconciliationStatus({
          ended_at: row.ended_at,
          is_reconciled: row.is_reconciled,
        });
        if (status === 'active') {
          return <span className="text-slate-400">—</span>;
        }
        return (
          <span className={amount !== 0 ? 'font-medium text-error' : 'text-slate-500'}>
            {formatShiftDiscrepancyLabel(amount)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      render: (row: ReconciliationShift) => (
        <ShiftReconciliationBadge
          endedAt={row.ended_at}
          isReconciled={row.is_reconciled}
        />
      ),
    },
    {
      header: '',
      render: (row: ReconciliationShift) => {
        const status = getShiftReconciliationStatus({
          ended_at: row.ended_at,
          is_reconciled: row.is_reconciled,
        });
        if (status !== 'pending') return null;
        return (
          <Button
            variant="secondary"
            size="sm"
            isLoading={reconcilingId === row.id}
            onClick={(e) => {
              e.stopPropagation();
              void handleReconcile(row.id);
            }}
          >
            Mark reconciled
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <p className="mb-4 text-sm text-slate-500">Showing data for {data.dateRangeLabel}</p>

      <FinancialStatCards
        financials={data.financials}
        descriptions={data.financialDescriptions}
        className="mb-6"
      />

      <div className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Shifts', value: summary.totalShifts },
          { label: 'Total sourced', value: formatCurrency(summary.totalSourced) },
          { label: 'Shift commission', value: formatCurrency(summary.totalCommission) },
          { label: 'Net discrepancy', value: formatCurrency(summary.totalDiscrepancy) },
          { label: 'Pending review', value: summary.unreconciledCount },
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
      <p className="mb-4 text-xs text-slate-400">
        Discrepancy = ending float minus (starting float − parts sourced). Shifts with ₦0
        discrepancy auto-reconcile on clock-out.
      </p>

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
