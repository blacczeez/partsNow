'use client';

import { Play, AlertTriangle, Wallet, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import type { RunnerShift, RunnerFloat } from '@/lib/types/database';

interface ShiftStatusCardProps {
  shift: RunnerShift | null;
  float: RunnerFloat | null;
  isStarting: boolean;
  onStartShift: () => void;
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function ShiftStatusCard({
  shift,
  float,
  isStarting,
  onStartShift,
}: ShiftStatusCardProps) {
  const minFloat = 50000;
  const hasInsufficientFloat = !float || float.balance < minFloat;

  if (!shift) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">Off Shift</p>
              <p className="text-sm text-slate-500">Start your shift to receive orders</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Wallet className="h-4 w-4" />
              <span>Float: {float ? formatCurrency(float.balance) : '---'}</span>
            </div>
          </div>

          {hasInsufficientFloat && (
            <div className="mb-4 flex items-center gap-2 rounded-button bg-warning-light px-3 py-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Minimum float of {formatCurrency(minFloat)} required to start shift
              </span>
            </div>
          )}

          <Button
            fullWidth
            onClick={onStartShift}
            disabled={hasInsufficientFloat || isStarting}
            isLoading={isStarting}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Shift
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-success/30 bg-success-light/30">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
            <p className="font-semibold text-slate-900">On Shift</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(shift.started_at)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-button bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">Float</p>
            <p className="text-sm font-semibold text-slate-900">
              {float ? formatCurrency(float.balance) : '---'}
            </p>
          </div>
          <div className="rounded-button bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">Orders</p>
            <p className="text-sm font-semibold text-slate-900">
              {shift.orders_completed}
            </p>
          </div>
          <div className="rounded-button bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">Earned</p>
            <p className="text-sm font-semibold text-success">
              {formatCurrency(shift.commission_earned)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
