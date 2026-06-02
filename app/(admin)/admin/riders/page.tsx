'use client';

import { useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useAdminRiders } from '@/lib/hooks/use-admin-riders';
import { formatRelativeTime } from '@/lib/utils/format';

interface RiderDetail {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  activeDeliveries: Array<{
    order_id: string;
    status: string;
    assigned_at: string;
  }>;
  recentHistory: Array<{
    order_id: string;
    status: string;
    assigned_at: string;
    completed_at: string | null;
  }>;
}

export default function AdminRidersPage() {
  const { riders, pagination, isLoading, page, setPage } = useAdminRiders();
  const [selectedRider, setSelectedRider] = useState<RiderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRowClick = async (row: (typeof riders)[0]) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/riders/${row.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRider(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      header: 'Name',
      render: (row: (typeof riders)[0]) => (
        <span className="font-medium text-slate-900">{row.full_name}</span>
      ),
    },
    {
      header: 'Phone',
      render: (row: (typeof riders)[0]) => row.phone,
    },
    {
      header: 'Status',
      render: (row: (typeof riders)[0]) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Active Deliveries',
      render: (row: (typeof riders)[0]) => (
        <span className={row.active_deliveries > 0 ? 'font-medium text-primary' : ''}>
          {row.active_deliveries}
        </span>
      ),
    },
    {
      header: 'Total Completed',
      render: (row: (typeof riders)[0]) => row.total_completed,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Riders</h1>

      <DataTable
        columns={columns}
        data={riders}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyMessage="No riders found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      {/* Rider Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedRider || detailLoading}
        onClose={() => setSelectedRider(null)}
        title="Rider Details"
      >
        {detailLoading || !selectedRider ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-16 rounded bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedRider.full_name}</h3>
              <p className="text-sm text-slate-500">{selectedRider.phone}</p>
              <Badge variant={selectedRider.is_active ? 'success' : 'error'} className="mt-1">
                {selectedRider.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <p className="mt-1 text-xs text-slate-400">
                Joined: {new Date(selectedRider.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Active Deliveries */}
            {selectedRider.activeDeliveries.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Active Deliveries</h4>
                <div className="space-y-2">
                  {selectedRider.activeDeliveries.map((d) => (
                    <div key={d.order_id} className="flex items-center justify-between rounded-button bg-blue-50 px-3 py-2">
                      <span className="text-sm text-slate-700">Order: {d.order_id.slice(0, 8)}...</span>
                      <Badge variant="primary">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent History */}
            {selectedRider.recentHistory.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Recent History</h4>
                <div className="space-y-1">
                  {selectedRider.recentHistory.slice(0, 10).map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{formatRelativeTime(h.assigned_at)}</span>
                      <Badge variant={h.status === 'completed' ? 'success' : h.status === 'failed' ? 'error' : 'default'}>
                        {h.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
