'use client';

import { useState } from 'react';
import { Clock, Package, Wallet, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import type { RunnerShift, RunnerFloat } from '@/lib/types/database';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: RunnerShift;
  float: RunnerFloat | null;
  onConfirmEnd: (notes?: string) => Promise<void>;
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function ShiftSummaryModal({
  isOpen,
  onClose,
  shift,
  float,
  onConfirmEnd,
}: ShiftSummaryModalProps) {
  const [notes, setNotes] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await onConfirmEnd(notes || undefined);
      setNotes('');
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsEnding(false);
    }
  };

  const currentFloat = float?.balance ?? 0;
  const floatDiff = currentFloat - shift.starting_float;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="End Shift">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-button bg-slate-50 p-3 text-center">
            <Clock className="mx-auto mb-1 h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-500">Duration</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatDuration(shift.started_at)}
            </p>
          </div>

          <div className="rounded-button bg-slate-50 p-3 text-center">
            <Package className="mx-auto mb-1 h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-500">Orders</p>
            <p className="text-sm font-semibold text-slate-900">
              {shift.orders_completed}
            </p>
          </div>

          <div className="rounded-button bg-slate-50 p-3 text-center">
            <Wallet className="mx-auto mb-1 h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-500">Total Sourced</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(shift.total_sourced)}
            </p>
          </div>

          <div className="rounded-button bg-slate-50 p-3 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-success" />
            <p className="text-xs text-slate-500">Commission</p>
            <p className="text-sm font-semibold text-success">
              {formatCurrency(shift.commission_earned)}
            </p>
          </div>
        </div>

        <div className="rounded-button border border-slate-200 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Starting float</span>
            <span className="font-medium">{formatCurrency(shift.starting_float)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">Current float</span>
            <span className="font-medium">{formatCurrency(currentFloat)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
            <span className="text-slate-500">Difference</span>
            <span className={floatDiff < 0 ? 'font-medium text-error' : 'font-medium text-slate-900'}>
              {floatDiff >= 0 ? '+' : ''}{formatCurrency(floatDiff)}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="shift-notes"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Notes (optional)
          </label>
          <textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this shift?"
            maxLength={500}
            rows={2}
            className="w-full rounded-button border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleEnd}
            isLoading={isEnding}
          >
            End Shift
          </Button>
        </div>
      </div>
    </Modal>
  );
}
