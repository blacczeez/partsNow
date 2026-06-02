'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VendorFormSheet } from '@/components/admin/vendor-form-sheet';
import { useAdminVendors } from '@/lib/hooks/use-admin-vendors';
import { toast } from '@/components/ui/toast';

export default function AdminVendorsPage() {
  const { vendors, pagination, isLoading, actionLoading, page, setPage, createVendor, updateVendor } = useAdminVendors();
  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<(typeof vendors)[0] | null>(null);

  const handleRowClick = (row: (typeof vendors)[0]) => {
    setEditingVendor(row);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (editingVendor) {
      const success = await updateVendor(editingVendor.id, data);
      if (success) {
        toast('success', 'Vendor updated');
        return true;
      }
      toast('error', 'Failed to update vendor');
      return false;
    } else {
      const success = await createVendor(data as {
        name: string;
        contact_phone: string;
        contact_name?: string;
        cluster_id: string;
        location_in_market?: string;
        specializations?: string[];
        payment_terms?: string;
      });
      if (success) {
        toast('success', 'Vendor created');
        return true;
      }
      toast('error', 'Failed to create vendor');
      return false;
    }
  };

  const columns = [
    {
      header: 'Name',
      render: (row: (typeof vendors)[0]) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: 'Cluster',
      render: (row: (typeof vendors)[0]) => row.cluster_name,
    },
    {
      header: 'Specializations',
      render: (row: (typeof vendors)[0]) => (
        <div className="flex flex-wrap gap-1">
          {row.specializations.slice(0, 3).map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
          {row.specializations.length > 3 && (
            <Badge>+{row.specializations.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Reliability',
      render: (row: (typeof vendors)[0]) => (
        <span className={row.reliability_score >= 80 ? 'text-success' : row.reliability_score >= 60 ? 'text-warning' : 'text-error'}>
          {row.reliability_score}%
        </span>
      ),
    },
    {
      header: 'Orders',
      render: (row: (typeof vendors)[0]) => row.total_orders,
    },
    {
      header: 'Quality Issues',
      render: (row: (typeof vendors)[0]) => (
        <span className={row.quality_issues > 0 ? 'text-error' : ''}>
          {row.quality_issues}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row: (typeof vendors)[0]) => (
        <Badge variant={row.is_active ? 'success' : 'error'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditingVendor(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyMessage="No vendors found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      <VendorFormSheet
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingVendor(null); }}
        vendor={editingVendor ? {
          id: editingVendor.id,
          name: editingVendor.name,
          contact_phone: editingVendor.contact_phone,
          contact_name: editingVendor.contact_name || '',
          cluster_id: editingVendor.cluster_id,
          location_in_market: editingVendor.location_in_market || '',
          specializations: editingVendor.specializations,
          payment_terms: editingVendor.payment_terms,
          is_active: editingVendor.is_active,
        } : null}
        onSubmit={handleSubmit}
        isLoading={actionLoading}
      />
    </div>
  );
}
