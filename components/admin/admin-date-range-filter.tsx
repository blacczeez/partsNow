'use client';

import { DateInput } from '@/components/ui/date-input';
import { cn } from '@/lib/utils/cn';
import type { AdminDatePreset, AdminDateRangeValue } from '@/lib/utils/admin-date-range';
import { getDefaultAdminDateRange, toIsoDate } from '@/lib/utils/admin-date-range';

const PRESETS: Array<{ id: AdminDatePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'last7', label: '7 days' },
  { id: 'last30', label: '30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'allTime', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

interface AdminDateRangeFilterProps {
  value: AdminDateRangeValue;
  onChange: (value: AdminDateRangeValue) => void;
  className?: string;
}

export function AdminDateRangeFilter({
  value,
  onChange,
  className,
}: AdminDateRangeFilterProps) {
  function selectPreset(preset: AdminDatePreset) {
    if (preset === 'custom') {
      const today = toIsoDate(new Date());
      onChange({
        preset: 'custom',
        from: value.from || today,
        to: value.to || today,
      });
      return;
    }
    onChange(getDefaultAdminDateRange(preset));
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap gap-1 rounded-button border border-slate-300 p-1">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectPreset(id)}
            className={cn(
              'rounded-button px-3 py-1.5 text-sm font-medium transition-colors',
              value.preset === id
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <DateInput
            label="From"
            fieldSize="sm"
            value={value.from}
            max={value.to || undefined}
            onChange={(from) => onChange({ ...value, preset: 'custom', from })}
          />
          <DateInput
            label="To"
            fieldSize="sm"
            value={value.to}
            min={value.from || undefined}
            onChange={(to) => onChange({ ...value, preset: 'custom', to })}
          />
        </div>
      )}
    </div>
  );
}
