'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CategoryData {
  id?: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active?: boolean;
}

interface CategoryFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryData | null;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

export function CategoryFormSheet({
  isOpen,
  onClose,
  category,
  onSubmit,
  isLoading,
}: CategoryFormSheetProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [sortOrder, setSortOrder] = useState(
    category?.sort_order != null ? String(category.sort_order) : '0'
  );
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    const sort = parseInt(sortOrder, 10);
    if (Number.isNaN(sort) || sort < 0) {
      setSubmitError('Sort order must be a non-negative number.');
      return;
    }

    const data: Record<string, unknown> = {
      name: name.trim(),
      sort_order: sort,
    };

    if (category?.id) {
      data.is_active = isActive;
    }

    const success = await onSubmit(data);
    if (success) {
      onClose();
    } else {
      setSubmitError('Could not save category. Check the fields and try again.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={category?.id ? 'Edit Category' : 'Add Category'}
    >
      {isOpen && (
        <form
          key={category?.id ?? 'new'}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brakes"
            required
          />
          {category?.id && (
            <p className="text-xs text-slate-500">
              URL slug: <span className="font-mono">{category.slug}</span>
            </p>
          )}
          <Input
            label="Sort order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          {category?.id && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          )}
          {submitError && <p className="text-sm text-error">{submitError}</p>}
          <Button type="submit" fullWidth isLoading={isLoading}>
            {category?.id ? 'Update Category' : 'Add Category'}
          </Button>
        </form>
      )}
    </BottomSheet>
  );
}
