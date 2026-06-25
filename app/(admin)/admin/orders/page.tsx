'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderDetailSheet } from '@/components/admin/order-detail-sheet';
import { useAdminOrders } from '@/lib/hooks/use-admin-orders';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';
import {
  ATTENTION_LABELS,
  ATTENTION_TYPES,
} from '@/lib/constants/admin-attention';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { ORDER_STATUSES } from '@/lib/constants/order-status';
import type { OrderStatus } from '@/lib/types/database';

export default function AdminOrdersPage() {
  const { values, setUrlState } = useAdminUrlState(['order']);
  const deepLinkOrderId = values.order || null;
  const { orders, pagination, isLoading, filters, setFilters, attentionLabel } =
    useAdminOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const activeOrderId = selectedOrderId ?? deepLinkOrderId;

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
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={row.status as OrderStatus} />
          {row.price_review_status === 'pending' && (
            <Badge variant="warning">Price review</Badge>
          )}
          {filters.attention === 'sourcing_escalated' && (
            <Badge variant="warning">Sourcing</Badge>
          )}
        </div>
      ),
    },
    ...(filters.attention === 'sla_breach'
      ? [
          {
            header: 'Overdue',
            render: (row: (typeof orders)[0]) =>
              row.minutes_overdue != null ? (
                <span className="font-medium text-error">
                  {Math.round(row.minutes_overdue)}m
                </span>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    {
      header: 'Total',
      render: (row: (typeof orders)[0]) => formatCurrency(row.total),
    },
    {
      header: 'Payment',
      render: (row: (typeof orders)[0]) => (
        <Badge
          variant={
            row.payment_status === 'paid'
              ? 'success'
              : row.payment_status === 'failed'
                ? 'error'
                : 'warning'
          }
        >
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

  const filterFields = filters.attention
    ? []
    : [
        {
          key: 'attention',
          label: 'Needs attention',
          type: 'select' as const,
          options: [
            { value: '', label: 'All orders' },
            ...ATTENTION_TYPES.map((type) => ({
              value: type,
              label: ATTENTION_LABELS[type],
            })),
          ],
        },
        {
          key: 'priceReview',
          label: 'Price review',
          type: 'select' as const,
          options: [
            { value: '', label: 'All orders' },
            { value: 'pending', label: 'Price review pending' },
          ],
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select' as const,
          options: [
            { value: '', label: 'All Statuses' },
            ...ORDER_STATUSES.map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            })),
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
      <AdminPageHeader
        title={attentionLabel ? attentionLabel : 'Orders'}
        description={
          attentionLabel
            ? `${pagination.total} order${pagination.total === 1 ? '' : 's'} in this queue`
            : undefined
        }
        filters={
          filterFields.length > 0 ? (
            <FilterBar
              fields={filterFields}
              values={{
                attention: filters.attention || '',
                priceReview: filters.priceReview || '',
                status: filters.status || '',
                search: filters.search || '',
              }}
              onApply={(vals) =>
                setFilters({
                  page: 1,
                  attention: vals.attention
                    ? (vals.attention as typeof filters.attention)
                    : undefined,
                  priceReview: vals.priceReview === 'pending' ? 'pending' : undefined,
                  status: (vals.status as OrderStatus) || undefined,
                  search: vals.search || undefined,
                })
              }
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ page: 1 })}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Clear queue filter
            </Button>
          )
        }
      />

      {filters.attention && (
        <p className="mb-4 text-sm text-slate-500">
          Showing oldest first.{' '}
          <Link href="/admin/orders" className="text-primary hover:underline">
            Back to all orders
          </Link>
        </p>
      )}

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedOrderId(row.id)}
        emptyMessage={
          attentionLabel ? `No orders in ${attentionLabel.toLowerCase()}` : 'No orders found'
        }
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: (p) => setFilters({ ...filters, page: p }),
        }}
      />

      <OrderDetailSheet
        orderId={activeOrderId}
        isOpen={!!activeOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setUrlState({ order: null });
        }}
      />
    </div>
  );
}
