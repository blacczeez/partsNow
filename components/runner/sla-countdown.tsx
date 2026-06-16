'use client';

import { Clock, PauseCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { SlaTimerState } from '@/lib/utils/sla-timer';

interface SlaCountdownProps {
  state: SlaTimerState | null;
  compact?: boolean;
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const phaseStyles = {
  green: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-700',
    bar: 'bg-green-500',
    barTrack: 'bg-green-200',
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    barTrack: 'bg-amber-200',
  },
  red: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-700',
    bar: 'bg-red-500',
    barTrack: 'bg-red-200',
  },
  breached: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    text: 'text-red-800',
    bar: 'bg-red-600',
    barTrack: 'bg-red-200',
  },
};

export function SlaCountdown({ state, compact }: SlaCountdownProps) {
  if (!state) return null;

  const styles = phaseStyles[state.phase];

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 text-sm font-medium', styles.text)}>
        {state.isPaused ? (
          <>
            <PauseCircle className="h-4 w-4" />
            <span>Paused</span>
          </>
        ) : state.phase === 'breached' ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>Breached</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span>{formatCountdown(state.remainingSeconds)}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-card border p-4',
        styles.border,
        styles.bg,
        state.phase === 'breached' && 'animate-pulse'
      )}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className={cn('flex items-center gap-2 text-sm font-medium', styles.text)}>
          {state.isPaused ? (
            <PauseCircle className="h-4 w-4" />
          ) : state.phase === 'breached' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span>Sourcing SLA</span>
        </div>
        <span className={cn('text-lg font-bold tabular-nums', styles.text)}>
          {state.isPaused ? '--:--' : formatCountdown(state.remainingSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className={cn('h-2 w-full overflow-hidden rounded-full', styles.barTrack)}>
        <div
          className={cn('h-full rounded-full transition-all duration-1000', styles.bar)}
          style={{ width: `${Math.min(100, state.percentElapsed)}%` }}
        />
      </div>

      {/* Pause reason or breach message */}
      {state.isPaused && state.pauseReason && (
        <p className="mt-2 text-xs text-slate-500">
          {state.pauseReason} — not counting against you
        </p>
      )}
      {state.phase === 'breached' && (
        <p className={cn('mt-2 text-xs font-medium', styles.text)}>
          SLA Breached — Ops has been notified
        </p>
      )}
    </div>
  );
}
