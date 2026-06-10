'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PartFormSheet } from '@/components/admin/part-form-sheet';
import { useAdminParts } from '@/lib/hooks/use-admin-parts';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants/categories';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

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
    category,
    setCategory,
    createPart,
    updatePart,
  } = useAdminParts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<(typeof parts)[0] | null>(null);
  const [searchInput, setSearchInput] = useState('');

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
      toast('error', 'Failed to update part');
      return false;
    } else {
      const success = await createPart(data as {
        name: string;
        category: string;
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
      toast('error', 'Failed to create part');
      return false;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
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
      render: (row: (typeof parts)[0]) =>
        CATEGORY_MAP[row.category]?.name ?? row.category,
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
      header: 'Vendors',
      render: (row: (typeof parts)[0]) => row.vendor_count,
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Parts</h1>
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
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
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

        <Select
          fieldSize="sm"
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>

        {(search || category) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setCategory('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

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
          category: editingPart.category,
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
    </div>
  );
}
