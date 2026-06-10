'use client';

import { useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { Badge } from '@/components/ui/badge';
import { CustomerDetailSheet } from '@/components/admin/customer-detail-sheet';
import { useAdminCustomers } from '@/lib/hooks/use-admin-customers';
import { formatCurrency } from '@/lib/utils/format';

const tierVariants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  new: 'default',
  verified: 'info',
  trusted: 'primary',
  partner: 'success',
};

export default function AdminCustomersPage() {
  const { customers, pagination, isLoading, page, setPage, search, setSearch, tier, setTier } = useAdminCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const columns = [
    {
      header: 'Name',
      render: (row: (typeof customers)[0]) => (
        <span className="font-medium text-slate-900">{row.full_name}</span>
      ),
    },
    {
      header: 'Phone',
      render: (row: (typeof customers)[0]) => row.phone,
    },
    {
      header: 'Type',
      render: (row: (typeof customers)[0]) => (
        <span className="capitalize">{row.user_type.replace('_', ' ')}</span>
      ),
    },
    {
      header: 'Tier',
      render: (row: (typeof customers)[0]) => (
        <Badge variant={tierVariants[row.loyalty_tier] || 'default'}>
          {row.loyalty_tier}
        </Badge>
      ),
    },
    {
      header: 'Orders',
      render: (row: (typeof customers)[0]) => row.total_orders,
    },
    {
      header: 'Lifetime Spend',
      render: (row: (typeof customers)[0]) => formatCurrency(row.lifetime_spend),
    },
    {
      header: 'Wallet',
      render: (row: (typeof customers)[0]) => formatCurrency(row.wallet_balance),
    },
  ];

  const filterFields = [
    {
      key: 'tier',
      label: 'Loyalty Tier',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Tiers' },
        { value: 'new', label: 'New' },
        { value: 'verified', label: 'Verified' },
        { value: 'trusted', label: 'Trusted' },
        { value: 'partner', label: 'Partner' },
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
        title="Customers"
        filters={
          <FilterBar
            fields={filterFields}
            values={{ tier, search }}
            onApply={(vals) => {
              setTier(vals.tier || '');
              setSearch(vals.search || '');
            }}
          />
        }
      />

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedCustomerId(row.id)}
        emptyMessage="No customers found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      <CustomerDetailSheet
        customerId={selectedCustomerId}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
}
