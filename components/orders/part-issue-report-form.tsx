'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  PART_ISSUE_LABELS,
  PART_ISSUE_SUBTYPES,
  type PartIssueSubtype,
} from '@/lib/constants/vendor-incidents';

interface OrderItemForReport {
  id: string;
  description: string;
  part_issue_reported?: boolean;
  is_found?: boolean;
}

interface PartIssueReportFormProps {
  items: OrderItemForReport[];
  onSubmit: (
    reports: Array<{
      itemId: string;
      issueSubtype: PartIssueSubtype;
      notes?: string;
    }>
  ) => Promise<void>;
}

export function PartIssueReportForm({ items, onSubmit }: PartIssueReportFormProps) {
  const reportableItems = items.filter(
    (item) => item.is_found !== false && !item.part_issue_reported
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subtype, setSubtype] = useState<PartIssueSubtype | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (reportableItems.length === 0) return null;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError('Select at least one part');
      return;
    }
    if (!subtype) {
      setError('Select an issue type');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(
        [...selectedIds].map((itemId) => ({
          itemId,
          issueSubtype: subtype,
          notes: notes.trim() || undefined,
        }))
      );
      setSelectedIds(new Set());
      setSubtype('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-card border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-slate-900">Report a part problem</p>
          <p className="text-xs text-slate-600">
            Wrong part, damage, or fit issue? We&apos;ll review with the vendor.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-slate-500">Affected parts</p>
        {reportableItems.map((item) => (
          <label
            key={item.id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
              selectedIds.has(item.id)
                ? 'border-primary bg-white'
                : 'border-slate-200 bg-white'
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => toggleItem(item.id)}
              className="mt-1"
            />
            <span className="text-slate-900">{item.description}</span>
          </label>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase text-slate-500">What went wrong?</p>
        <div className="grid grid-cols-2 gap-2">
          {PART_ISSUE_SUBTYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubtype(value)}
              className={cn(
                'rounded-button border px-3 py-2 text-left text-xs',
                subtype === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 bg-white text-slate-700'
              )}
            >
              {PART_ISSUE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional details (optional)"
        rows={2}
        className="w-full rounded-input border border-slate-300 bg-white px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-error">{error}</p>}

      <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>
        Submit report
      </Button>
    </div>
  );
}
