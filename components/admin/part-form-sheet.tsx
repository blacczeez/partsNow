'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { PartCategory } from '@/lib/types/database';

interface PartData {
  id?: string;
  name: string;
  category_id: string;
  subcategory: string;
  oem_code: string;
  average_price: number | null;
  weight_kg: number | null;
  image_url: string;
  compatible_vehicles: unknown[];
  is_active?: boolean;
}

interface PartFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  part?: PartData | null;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

interface PartFormFieldsProps {
  part?: PartData | null;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  isLoading?: boolean;
}

function PartFormFields({ part, onClose, onSubmit, isLoading }: PartFormFieldsProps) {
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [name, setName] = useState(part?.name ?? '');
  const [categoryId, setCategoryId] = useState(part?.category_id ?? '');
  const [subcategory, setSubcategory] = useState(part?.subcategory ?? '');
  const [oemCode, setOemCode] = useState(part?.oem_code ?? '');
  const [averagePrice, setAveragePrice] = useState(
    part?.average_price != null ? String(part.average_price) : ''
  );
  const [weightKg, setWeightKg] = useState(
    part?.weight_kg != null ? String(part.weight_kg) : ''
  );
  const [imageUrl, setImageUrl] = useState(part?.image_url ?? '');
  const [compatibleVehicles, setCompatibleVehicles] = useState(
    part?.compatible_vehicles?.length
      ? JSON.stringify(part.compatible_vehicles, null, 2)
      : ''
  );
  const [isActive, setIsActive] = useState(part?.is_active ?? true);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);

    fetch('/api/admin/categories')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load categories');
        if (!cancelled) {
          const active = (data.categories ?? []).filter(
            (c: PartCategory) => c.is_active
          );
          setCategories(active);
          if (!part?.category_id && active.length > 0) {
            setCategoryId(active[0].id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmitError('Could not load categories. Try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [part?.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!categoryId) {
      setSubmitError('Please select a category.');
      return;
    }

    if (!weightKg || parseFloat(weightKg) <= 0) {
      setSubmitError('Weight (kg) is required for delivery pricing.');
      return;
    }

    const data: Record<string, unknown> = {
      name,
      category_id: categoryId,
      weight_kg: parseFloat(weightKg),
    };

    if (subcategory) data.subcategory = subcategory;
    if (oemCode) data.oem_code = oemCode;
    if (averagePrice) data.average_price = parseFloat(averagePrice);
    if (imageUrl) data.image_url = imageUrl;

    if (compatibleVehicles.trim()) {
      try {
        data.compatible_vehicles = JSON.parse(compatibleVehicles);
      } catch {
        setSubmitError('Compatible vehicles must be valid JSON.');
        return;
      }
    }

    if (part?.id) {
      data.is_active = isActive;
    }

    const success = await onSubmit(data);
    if (success) {
      onClose();
    } else {
      setSubmitError('Could not save part. Check the fields and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Part Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        required
        disabled={categoriesLoading || categories.length === 0}
      >
        <option value="">
          {categoriesLoading ? 'Loading categories...' : 'Select category'}
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {categories.length === 0 && !categoriesLoading && (
        <p className="text-xs text-amber-700">
          No active categories. Add one under Admin → Categories first.
        </p>
      )}
      <Input
        label="Subcategory"
        value={subcategory}
        onChange={(e) => setSubcategory(e.target.value)}
        placeholder="e.g. Front Brakes"
      />
      <Input
        label="OEM Code"
        value={oemCode}
        onChange={(e) => setOemCode(e.target.value)}
        placeholder="e.g. BP-12345"
      />
      <Input
        label="Average Price"
        type="number"
        value={averagePrice}
        onChange={(e) => setAveragePrice(e.target.value)}
        placeholder="0"
        min="0"
        step="0.01"
      />
      <Input
        label="Weight (kg) *"
        type="number"
        value={weightKg}
        onChange={(e) => setWeightKg(e.target.value)}
        placeholder="0"
        min="0"
        step="0.01"
      />
      <Input
        label="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://..."
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Compatible Vehicles (JSON)
        </label>
        <textarea
          value={compatibleVehicles}
          onChange={(e) => setCompatibleVehicles(e.target.value)}
          rows={3}
          placeholder='[{"make":"Toyota","model":"Camry","year_start":2015,"year_end":2020}]'
          className="flex w-full rounded-input border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {part?.id && (
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
      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        disabled={categoriesLoading || categories.length === 0}
      >
        {part?.id ? 'Update Part' : 'Add Part'}
      </Button>
    </form>
  );
}

export function PartFormSheet({ isOpen, onClose, part, onSubmit, isLoading }: PartFormSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={part?.id ? 'Edit Part' : 'Add Part'}
    >
      {isOpen && (
        <PartFormFields
          key={part?.id ?? 'new'}
          part={part}
          onClose={onClose}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      )}
    </BottomSheet>
  );
}
