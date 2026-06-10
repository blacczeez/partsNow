'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';

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
        {new Date(row.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

function ReconciliationResults({ date }: { date: string }) {
  const [shifts, setShifts] = useState<ReconciliationShift[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/reconciliation?date=${date}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reconciliation');
        if (!cancelled) {
          setShifts(data.shifts ?? []);
          setSummary(data.summary ?? null);
        }
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
  }, [date]);

  return (
    <>
      {error && (
        <p className="mb-4 rounded-card border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Shifts', value: summary.totalShifts },
            { label: 'Total sourced', value: formatCurrency(summary.totalSourced) },
            { label: 'Commission', value: formatCurrency(summary.totalCommission) },
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
      )}

      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        emptyMessage="No runner shifts for this date"
      />
    </>
  );
}

function ReconciliationContent() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Reconciliation"
        description="Daily runner shift float and sourcing totals."
        filters={
          <div className="flex max-w-xs items-end gap-2">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
              Refresh
            </Button>
          </div>
        }
      />

      <ReconciliationResults key={`${date}-${refreshKey}`} date={date} />
    </div>
  );
}

export default function AdminReconciliationPage() {
  return <ReconciliationContent />;
}
