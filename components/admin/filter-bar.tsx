'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'search';
  options?: Array<{ value: string; label: string }>;
}

interface FilterBarProps {
  fields: FilterField[];
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

export function FilterBar({ fields, values, onApply }: FilterBarProps) {
  const [local, setLocal] = useState<Record<string, string>>(values);

  const handleChange = (key: string, value: string) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    // Auto-apply for selects
    const field = fields.find((f) => f.key === key);
    if (field?.type === 'select') {
      onApply(next);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(local);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-card border border-slate-200 bg-white p-4"
    >
      {fields.map((field) => {
        if (field.type === 'select') {
          return (
            <div key={field.key} className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {field.label}
              </label>
              <select
                value={local[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="h-9 w-full rounded-button border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <div key={field.key} className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {field.label}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={local[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={`Search...`}
                className="h-9 w-full rounded-button border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        );
      })}
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
