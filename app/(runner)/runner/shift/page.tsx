'use client';

import { useState } from 'react';
import { Clock, Wallet, Package, TrendingUp, Loader2, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShiftSummaryModal } from '@/components/runner/shift-summary-modal';
import { useRunnerShift } from '@/lib/hooks/use-runner-shift';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function ShiftPage() {
  const { shift, float, isLoading, endShift } = useRunnerShift();
  const [showSummary, setShowSummary] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Shift</h1>
          <Link
            href="/runner/shifts"
            className="flex items-center gap-1.5 rounded-button border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <History className="h-4 w-4" />
            History
          </Link>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Wallet className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Float Balance</p>
                <p className="text-xl font-bold text-slate-900">
                  {float ? formatCurrency(float.balance) : '---'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              You're currently off shift. Go to the Dashboard to start your shift.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEndShift = async (notes?: string) => {
    try {
      await endShift(notes);
      toast('success', 'Shift ended');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to end shift');
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Current Shift</h1>
        <Link
          href="/runner/shifts"
          className="flex items-center gap-1.5 rounded-button border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <History className="h-4 w-4" />
          History
        </Link>
      </div>

      {/* Shift Status */}
      <Card className="border-success/30">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
            <span className="font-semibold text-slate-900">Active</span>
            <span className="ml-auto text-sm text-slate-500">
              Started {new Date(shift.started_at).toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-button bg-slate-100">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatDuration(shift.started_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-button bg-slate-100">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Orders</p>
                <p className="text-base font-semibold text-slate-900">
                  {shift.orders_completed}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-button bg-slate-100">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Sourced</p>
                <p className="text-base font-semibold text-slate-900">
                  {formatCurrency(shift.total_sourced)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-button bg-success-light">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Commission</p>
                <p className="text-base font-semibold text-success">
                  {formatCurrency(shift.commission_earned)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Float Balance */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Float Balance</span>
            </div>
            <span className="text-lg font-bold text-slate-900">
              {float ? formatCurrency(float.balance) : '---'}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
            <span>Starting float</span>
            <span>{formatCurrency(shift.starting_float)}</span>
          </div>
        </CardContent>
      </Card>

      {/* End Shift */}
      <Button
        variant="destructive"
        fullWidth
        size="lg"
        onClick={() => setShowSummary(true)}
      >
        End Shift
      </Button>

      <ShiftSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        shift={shift}
        float={float}
        onConfirmEnd={handleEndShift}
      />
    </div>
  );
}
