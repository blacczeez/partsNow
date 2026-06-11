'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PartFormSheet } from '@/components/admin/part-form-sheet';
import { PartVendorsSheet } from '@/components/admin/part-vendors-sheet';
import { useAdminParts } from '@/lib/hooks/use-admin-parts';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import type { PartCategory } from '@/lib/types/database';

function PartsSearchForm({
  appliedSearch,
  onApply,
}: {
  appliedSearch: string;
  onApply: (value: string) => void;
}) {
  const [searchInput, setSearchInput] = useState(appliedSearch);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(searchInput);
      }}
      className="flex items-center gap-2"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name or OEM code..."
          className="h-9 rounded-input border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Search
      </Button>
    </form>
  );
}

export default function AdminPartsPage() {
  const {
    parts,
    pagination,
    isLoading,
    actionLoading,
    page,
    setPage,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    missingWeight,
    setMissingWeight,
    createPart,
    updatePart,
  } = useAdminParts();
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [missingWeightCount, setMissingWeightCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<(typeof parts)[0] | null>(null);
  const [vendorsPartId, setVendorsPartId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/parts?missingWeight=true&limit=1')
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled && res.ok) {
          setMissingWeightCount(data.pagination?.total ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setMissingWeightCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [parts]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/categories')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setCategories(data.categories ?? []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRowClick = (row: (typeof parts)[0]) => {
    setEditingPart(row);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (editingPart) {
      const success = await updatePart(editingPart.id, data);
      if (success) {
        toast('success', 'Part updated');
        return true;
      }
      return false;
    }

    const success = await createPart(data as {
      name: string;
      category_id: string;
      subcategory?: string;
      oem_code?: string;
      average_price?: number;
      weight_kg?: number;
      image_url?: string;
      compatible_vehicles?: unknown[];
    });
    if (success) {
      toast('success', 'Part created');
      return true;
    }
    return false;
  };

  const columns = [
    {
      header: 'Name',
      render: (row: (typeof parts)[0]) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: 'Category',
      render: (row: (typeof parts)[0]) => row.category_name,
    },
    {
      header: 'OEM Code',
      render: (row: (typeof parts)[0]) => (
        <span className="font-mono text-sm text-slate-500">
          {row.oem_code || '-'}
        </span>
      ),
    },
    {
      header: 'Avg Price',
      render: (row: (typeof parts)[0]) =>
        row.average_price != null ? formatCurrency(row.average_price) : '-',
    },
    {
      header: 'Weight',
      render: (row: (typeof parts)[0]) =>
        row.weight_kg != null ? (
          <span>{row.weight_kg} kg</span>
        ) : (
          <Badge variant="warning">Missing</Badge>
        ),
    },
    {
      header: 'Vendors',
      render: (row: (typeof parts)[0]) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setVendorsPartId(row.id);
          }}
          className="font-medium text-primary hover:underline"
          disabled={row.vendor_count === 0}
        >
          {row.vendor_count}
        </button>
      ),
    },
    {
      header: 'Status',
      render: (row: (typeof parts)[0]) => (
        <Badge variant={row.is_active ? 'success' : 'error'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Parts"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingPart(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Part
          </Button>
        }
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <PartsSearchForm key={search} appliedSearch={search} onApply={setSearch} />

            <Select
              fieldSize="sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Button
              size="sm"
              variant={missingWeight ? 'primary' : 'secondary'}
              onClick={() => setMissingWeight(!missingWeight)}
            >
              Missing weight{missingWeightCount > 0 ? ` (${missingWeightCount})` : ''}
            </Button>

            {(search || categoryId || missingWeight) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setCategoryId('');
                  setMissingWeight(false);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        }
      />

      {missingWeightCount > 0 && !missingWeight && (
        <div className="mb-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {missingWeightCount} part{missingWeightCount === 1 ? '' : 's'} missing weight — customers
          cannot add them to cart.{' '}
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => setMissingWeight(true)}
          >
            Show missing weight
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={parts}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyMessage="No parts found"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: setPage,
        }}
      />

      <PartFormSheet
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingPart(null); }}
        part={editingPart ? {
          id: editingPart.id,
          name: editingPart.name,
          category_id: editingPart.category_id,
          subcategory: editingPart.subcategory || '',
          oem_code: editingPart.oem_code || '',
          average_price: editingPart.average_price,
          weight_kg: editingPart.weight_kg,
          image_url: editingPart.image_url || '',
          compatible_vehicles: editingPart.compatible_vehicles ?? [],
          is_active: editingPart.is_active,
        } : null}
        onSubmit={handleSubmit}
        isLoading={actionLoading}
      />

      <PartVendorsSheet
        partId={vendorsPartId}
        isOpen={!!vendorsPartId}
        onClose={() => setVendorsPartId(null)}
      />
    </div>
  );
}
