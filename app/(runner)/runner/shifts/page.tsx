'use client';

import Link from 'next/link';
import { ArrowLeft, History, Loader2 } from 'lucide-react';
import { ShiftHistoryCard } from '@/components/runner/shift-history-card';
import { useRunnerShiftHistory } from '@/lib/hooks/use-runner-shift-history';
import { formatCurrency } from '@/lib/utils/format';

export default function RunnerShiftHistoryPage() {
  const { shifts, total, isLoading, error } = useRunnerShiftHistory();

  const totalCommission = shifts.reduce((sum, s) => sum + s.commission_earned, 0);
  const totalOrders = shifts.reduce((sum, s) => sum + s.orders_completed, 0);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/runner/shift"
          className="rounded-button p-1 hover:bg-slate-100"
          aria-label="Back to shift"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Shift history</h1>
          <p className="text-sm text-slate-500">
            Past shifts and how you performed
          </p>
        </div>
      </div>

      {!isLoading && shifts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-card border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-500">Shifts</p>
            <p className="text-lg font-bold text-slate-900">{total}</p>
          </div>
          <div className="rounded-card border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-500">Orders</p>
            <p className="text-lg font-bold text-slate-900">{totalOrders}</p>
          </div>
          <div className="rounded-card border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-500">Commission</p>
            <p className="text-lg font-bold text-success">
              {formatCurrency(totalCommission)}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-error">{error}</p>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <History className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No shifts yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Your completed shifts will show up here
          </p>
          <Link
            href="/runner/dashboard"
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <ShiftHistoryCard key={shift.id} shift={shift} />
          ))}
        </div>
      )}
    </div>
  );
}
