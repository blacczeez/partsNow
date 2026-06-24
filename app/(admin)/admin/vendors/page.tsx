'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VendorFormSheet } from '@/components/admin/vendor-form-sheet';
import { ActivateVendorSheet } from '@/components/admin/activate-vendor-sheet';
import { VendorDetailSheet } from '@/components/admin/vendor-detail-sheet';
import { DuplicateVendorsPanel } from '@/components/admin/duplicate-vendors-panel';
import { useAdminVendors } from '@/lib/hooks/use-admin-vendors';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import { toast } from '@/components/ui/toast';

export default function AdminVendorsPage() {
  const {
    vendors,
    pagination,
    isLoading,
    actionLoading,
    page,
    setPage,
    filter,
    setFilter,
    createVendor,
    updateVendor,
    activateVendor,
    refresh,
  } = useAdminVendors();
  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<(typeof vendors)[0] | null>(null);
  const [activatingVendor, setActivatingVendor] = useState<(typeof vendors)[0] | null>(null);
  const [detailVendorId, setDetailVendorId] = useState<string | null>(null);

  const handleRowClick = (row: (typeof vendors)[0]) => {
    if (row.verification_status === VENDOR_VERIFICATION_STATUS.PENDING) {
      setActivatingVendor(row);
      return;
    }
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

  const handleActivate = async (data: {
    contact_phone: string;
    location_in_market?: string;
    notes?: string;
  }) => {
    if (!activatingVendor) return false;
    const success = await activateVendor(activatingVendor.id, data);
    if (success) {
      toast('success', 'Vendor activated');
      return true;
    }
    toast('error', 'Failed to activate vendor');
    return false;
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
      header: 'Location',
      render: (row: (typeof vendors)[0]) => (
        <span className="text-slate-500">{row.location_in_market || '—'}</span>
      ),
    },
    {
      header: 'Reliability',
      render: (row: (typeof vendors)[0]) => (
        <button
          type="button"
          className={
            row.reliability_score >= 80
              ? 'font-medium text-success underline-offset-2 hover:underline'
              : row.reliability_score >= 60
                ? 'font-medium text-warning underline-offset-2 hover:underline'
                : 'font-medium text-error underline-offset-2 hover:underline'
          }
          onClick={(e) => {
            e.stopPropagation();
            setDetailVendorId(row.id);
          }}
        >
          {row.reliability_score}%
        </button>
      ),
    },
    {
      header: 'Orders',
      render: (row: (typeof vendors)[0]) => row.total_orders,
    },
    {
      header: 'Verification',
      render: (row: (typeof vendors)[0]) => (
        <Badge
          variant={
            row.verification_status === VENDOR_VERIFICATION_STATUS.PENDING
              ? 'warning'
              : 'success'
          }
        >
          {row.verification_status === VENDOR_VERIFICATION_STATUS.PENDING
            ? 'Pending review'
            : 'Active'}
        </Badge>
      ),
    },
    {
      header: '',
      render: (row: (typeof vendors)[0]) =>
        row.verification_status === VENDOR_VERIFICATION_STATUS.PENDING ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setActivatingVendor(row);
            }}
          >
            Activate
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">
            Runner quick-adds appear as pending until you add a phone and activate.
          </p>
        </div>
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

      <DuplicateVendorsPanel onMerged={refresh} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'pending', 'active'] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'primary' : 'secondary'}
            onClick={() => setFilter(key)}
          >
            {key === 'all' ? 'All' : key === 'pending' ? 'Pending review' : 'Active'}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyMessage={
          filter === 'pending' ? 'No vendors pending review' : 'No vendors found'
        }
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      <VendorFormSheet
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingVendor(null);
        }}
        vendor={
          editingVendor
            ? {
                id: editingVendor.id,
                name: editingVendor.name,
                contact_phone: editingVendor.contact_phone ?? '',
                contact_name: editingVendor.contact_name || '',
                cluster_id: editingVendor.cluster_id,
                location_in_market: editingVendor.location_in_market || '',
                specializations: editingVendor.specializations,
                payment_terms: editingVendor.payment_terms,
                is_active: editingVendor.is_active,
              }
            : null
        }
        onSubmit={handleSubmit}
        isLoading={actionLoading}
      />

      <ActivateVendorSheet
        isOpen={!!activatingVendor}
        onClose={() => setActivatingVendor(null)}
        vendorName={activatingVendor?.name ?? ''}
        defaultLocation={activatingVendor?.location_in_market}
        onConfirm={handleActivate}
        isLoading={actionLoading}
      />

      <VendorDetailSheet
        vendorId={detailVendorId}
        isOpen={!!detailVendorId}
        onClose={() => setDetailVendorId(null)}
        onEdit={() => {
          const vendor = vendors.find((v) => v.id === detailVendorId);
          if (vendor) {
            setDetailVendorId(null);
            setEditingVendor(vendor);
            setFormOpen(true);
          }
        }}
      />
    </div>
  );
}
