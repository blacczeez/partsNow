'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClusterFormSheet } from '@/components/admin/cluster-form-sheet';
import { toast } from '@/components/ui/toast';

interface ClusterRow {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  is_active: boolean;
}

const columns = [
  {
    header: 'Market',
    render: (row: ClusterRow) => (
      <span className="font-medium text-slate-900">{row.name}</span>
    ),
  },
  {
    header: 'Location',
    render: (row: ClusterRow) => `${row.city}, ${row.state}`,
  },
  {
    header: 'Radius',
    render: (row: ClusterRow) => `${row.delivery_radius_km} km`,
  },
  {
    header: 'Coordinates',
    render: (row: ClusterRow) => (
      <span className="font-mono text-xs text-slate-500">
        {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
      </span>
    ),
  },
  {
    header: 'Status',
    render: (row: ClusterRow) => (
      <Badge variant={row.is_active ? 'success' : 'error'}>
        {row.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

function MarketsTable({ onRowClick }: { onRowClick: (row: ClusterRow) => void }) {
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/clusters')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load markets');
        if (!cancelled) setClusters(data.clusters ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load markets');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading && clusters.length === 0) {
    return <AdminPageSkeleton tableColumns={5} />;
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-card border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={clusters}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyMessage="No markets configured"
      />
    </>
  );
}

export default function AdminMarketsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterRow | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(
        editingCluster ? `/api/admin/clusters/${editingCluster.id}` : '/api/admin/clusters',
        {
          method: editingCluster ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        toast('success', editingCluster ? 'Market updated' : 'Market created');
        setRefreshKey((key) => key + 1);
        return true;
      }

      const body = await res.json();
      toast('error', body.error || 'Failed to save market');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Markets"
        description="Manage delivery clusters and market zones."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingCluster(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Market
          </Button>
        }
      />

      <MarketsTable
        key={refreshKey}
        onRowClick={(row) => {
          setEditingCluster(row);
          setFormOpen(true);
        }}
      />

      <ClusterFormSheet
        key={editingCluster?.id ?? 'new'}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCluster(null);
        }}
        cluster={editingCluster}
        onSubmit={handleSubmit}
        isLoading={actionLoading}
      />
    </div>
  );
}
