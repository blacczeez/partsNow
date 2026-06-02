'use client';

import { DataTable } from '@/components/admin/data-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { Badge } from '@/components/ui/badge';
import { useAdminPayments } from '@/lib/hooks/use-admin-payments';
import { formatCurrency } from '@/lib/utils/format';

export default function AdminPaymentsPage() {
  const { payments, pagination, isLoading, page, setPage, type, setType, status, setStatus } = useAdminPayments();

  const columns = [
    {
      header: 'Date',
      render: (row: (typeof payments)[0]) => (
        <span className="text-slate-500">
          {new Date(row.created_at).toLocaleDateString()} {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'Type',
      render: (row: (typeof payments)[0]) => (
        <span className="capitalize">{row.type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      header: 'Amount',
      render: (row: (typeof payments)[0]) => (
        <span className="font-medium">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      header: 'Provider',
      render: (row: (typeof payments)[0]) => (
        <span className="capitalize">{row.provider ?? '—'}</span>
      ),
    },
    {
      header: 'Reference',
      render: (row: (typeof payments)[0]) => (
        <span className="font-mono text-xs text-slate-500">
          {row.provider_reference ? row.provider_reference.slice(0, 16) + '...' : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row: (typeof payments)[0]) => (
        <Badge variant={row.status === 'success' ? 'success' : row.status === 'failed' ? 'error' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Order',
      render: (row: (typeof payments)[0]) => (
        <span className="font-mono text-xs text-slate-500">
          {row.order_id ? row.order_id.slice(0, 8) + '...' : '—'}
        </span>
      ),
    },
  ];

  const filterFields = [
    {
      key: 'type',
      label: 'Type',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Types' },
        { value: 'charge_attempted', label: 'Charge Attempted' },
        { value: 'charge_succeeded', label: 'Charge Succeeded' },
        { value: 'charge_failed', label: 'Charge Failed' },
        { value: 'refund_initiated', label: 'Refund Initiated' },
        { value: 'refund_completed', label: 'Refund Completed' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'success', label: 'Success' },
        { value: 'failed', label: 'Failed' },
        { value: 'pending', label: 'Pending' },
      ],
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Payments</h1>

      <div className="mb-4">
        <FilterBar
          fields={filterFields}
          values={{ type, status }}
          onApply={(vals) => {
            setType(vals.type || '');
            setStatus(vals.status || '');
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        emptyMessage="No payment events found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
