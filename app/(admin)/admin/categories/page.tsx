'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPageSkeleton } from '@/components/admin/admin-page-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryFormSheet } from '@/components/admin/category-form-sheet';
import { toast } from '@/components/ui/toast';
import type { PartCategory } from '@/lib/types/database';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PartCategory | null>(null);

  async function loadCategories() {
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load categories');
    }
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    loadCategories()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      if (editingCategory) {
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return false;
        toast('success', 'Category updated');
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return false;
        toast('success', 'Category created');
      }
      await loadCategories();
      return true;
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Name',
      render: (row: PartCategory) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: 'Slug',
      render: (row: PartCategory) => (
        <span className="font-mono text-sm text-slate-500">{row.slug}</span>
      ),
    },
    {
      header: 'Sort',
      render: (row: PartCategory) => row.sort_order,
    },
    {
      header: 'Status',
      render: (row: PartCategory) => (
        <Badge variant={row.is_active ? 'success' : 'error'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return <AdminPageSkeleton tableColumns={4} />;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Categories"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={categories}
        onRowClick={(row) => {
          setEditingCategory(row);
          setFormOpen(true);
        }}
        emptyMessage="No categories yet"
      />

      <CategoryFormSheet
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={handleSubmit}
        isLoading={actionLoading}
      />
    </div>
  );
}
