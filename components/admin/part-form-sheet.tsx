'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CATEGORIES } from '@/lib/constants/categories';

interface PartData {
  id?: string;
  name: string;
  category: string;
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
  const [name, setName] = useState(part?.name ?? '');
  const [category, setCategory] = useState(part?.category ?? '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: Record<string, unknown> = {
      name,
      category,
    };

    if (subcategory) data.subcategory = subcategory;
    if (oemCode) data.oem_code = oemCode;
    if (averagePrice) data.average_price = parseFloat(averagePrice);
    if (weightKg) data.weight_kg = parseFloat(weightKg);
    if (imageUrl) data.image_url = imageUrl;

    if (compatibleVehicles.trim()) {
      try {
        data.compatible_vehicles = JSON.parse(compatibleVehicles);
      } catch {
        // Invalid JSON — skip
      }
    }

    if (part?.id) {
      data.is_active = isActive;
    }

    const success = await onSubmit(data);
    if (success) {
      onClose();
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
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select category</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
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
          label="Weight (kg)"
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
        <Button type="submit" fullWidth isLoading={isLoading}>
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
