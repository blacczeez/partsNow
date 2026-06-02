'use client';

import { useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { OrderDetailSheet } from '@/components/admin/order-detail-sheet';
import { useAdminOrders } from '@/lib/hooks/use-admin-orders';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { ORDER_STATUSES } from '@/lib/constants/order-status';
import type { OrderStatus } from '@/lib/types/database';

export default function AdminOrdersPage() {
  const { orders, pagination, isLoading, filters, setFilters } = useAdminOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const columns = [
    {
      header: 'Order #',
      render: (row: (typeof orders)[0]) => (
        <span className="font-medium text-slate-900">{row.order_number}</span>
      ),
    },
    {
      header: 'Customer',
      render: (row: (typeof orders)[0]) => row.customer_name,
    },
    {
      header: 'Status',
      render: (row: (typeof orders)[0]) => (
        <StatusBadge status={row.status as OrderStatus} />
      ),
    },
    {
      header: 'Total',
      render: (row: (typeof orders)[0]) => formatCurrency(row.total),
    },
    {
      header: 'Payment',
      render: (row: (typeof orders)[0]) => (
        <Badge variant={row.payment_status === 'paid' ? 'success' : row.payment_status === 'failed' ? 'error' : 'warning'}>
          {row.payment_status}
        </Badge>
      ),
    },
    {
      header: 'Channel',
      render: (row: (typeof orders)[0]) => (
        <span className="capitalize text-slate-500">{row.source_channel}</span>
      ),
    },
    {
      header: 'Created',
      render: (row: (typeof orders)[0]) => (
        <span className="text-slate-500">{formatRelativeTime(row.created_at)}</span>
      ),
    },
  ];

  const filterFields = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Statuses' },
        ...ORDER_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
      ],
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Orders</h1>

      <div className="mb-4">
        <FilterBar
          fields={filterFields}
          values={{ status: filters.status || '', search: filters.search || '' }}
          onApply={(vals) =>
            setFilters({
              page: 1,
              status: (vals.status as OrderStatus) || undefined,
              search: vals.search || undefined,
            })
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedOrderId(row.id)}
        emptyMessage="No orders found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: (p) => setFilters({ ...filters, page: p }),
        }}
      />

      <OrderDetailSheet
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
