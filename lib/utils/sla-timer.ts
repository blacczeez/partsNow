export type SlaPhase = 'green' | 'amber' | 'red' | 'breached';

export interface SlaTimerState {
  isPaused: boolean;
  pauseReason: string | null;
  remainingSeconds: number;
  totalSeconds: number;
  elapsedActiveSeconds: number;
  phase: SlaPhase;
  percentElapsed: number;
}

/**
 * Pure function to compute the current SLA timer state.
 * Works on both server and client — no DB calls, no side effects.
 */
export function computeSlaTimerState(
  deadlineAt: string | null,
  pausedAt: string | null,
  accumulatedPauseSeconds: number,
  acceptedAt: string | null,
  breached: boolean,
  amberThresholdPercent: number,
  redThresholdPercent: number,
  nowMs?: number
): SlaTimerState | null {
  if (!deadlineAt || !acceptedAt) return null;

  const now = nowMs ?? Date.now();
  const deadlineMs = new Date(deadlineAt).getTime();
  const acceptedMs = new Date(acceptedAt).getTime();

  const totalSeconds = Math.max(0, Math.round((deadlineMs - acceptedMs) / 1000));
  if (totalSeconds === 0) return null;

  // Total pause time: accumulated + current pause duration (if paused now)
  let totalPauseMs = accumulatedPauseSeconds * 1000;
  const isPaused = pausedAt !== null;
  if (isPaused) {
    totalPauseMs += now - new Date(pausedAt).getTime();
  }

  // Remaining = deadline + totalPauses - now
  const remainingMs = deadlineMs + totalPauseMs - now;
  const remainingSeconds = Math.round(remainingMs / 1000);

  // Elapsed active time = (now - acceptedAt) - totalPauses
  const elapsedActiveMs = Math.max(0, now - acceptedMs - totalPauseMs);
  const elapsedActiveSeconds = Math.round(elapsedActiveMs / 1000);

  const percentElapsed = Math.min(100, Math.max(0, (elapsedActiveSeconds / totalSeconds) * 100));

  let phase: SlaPhase;
  if (breached || remainingSeconds <= 0) {
    phase = 'breached';
  } else if (percentElapsed >= redThresholdPercent) {
    phase = 'red';
  } else if (percentElapsed >= amberThresholdPercent) {
    phase = 'amber';
  } else {
    phase = 'green';
  }

  return {
    isPaused,
    pauseReason: null, // Caller enriches this
    remainingSeconds: Math.max(0, remainingSeconds),
    totalSeconds,
    elapsedActiveSeconds,
    phase,
    percentElapsed,
  };
}

/**
 * Determine if the SLA timer should be paused based on order status fields.
 */
export function isSlaPaused(order: {
  price_review_status?: string | null;
  clarification_status?: string | null;
}): boolean {
  const priceStatus = order.price_review_status;
  if (priceStatus === 'pending' || priceStatus === 'awaiting_customer') {
    return true;
  }
  if (order.clarification_status === 'requested') {
    return true;
  }
  return false;
}

/**
 * Return a human-readable reason for the current pause, or null if not paused.
 */
export function slaPauseReason(order: {
  price_review_status?: string | null;
  clarification_status?: string | null;
}): string | null {
  const priceStatus = order.price_review_status;
  if (priceStatus === 'pending') {
    return 'Admin reviewing price';
  }
  if (priceStatus === 'awaiting_customer') {
    return 'Waiting for customer price decision';
  }
  if (order.clarification_status === 'requested') {
    return 'Waiting for customer clarification';
  }
  return null;
}
