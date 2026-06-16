'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeSlaTimerState,
  slaPauseReason,
  type SlaTimerState,
  type SlaPhase,
} from '@/lib/utils/sla-timer';

const AMBER_PERCENT = parseInt(
  process.env.NEXT_PUBLIC_SLA_WARNING_AMBER_PERCENTAGE ?? '50',
  10
);
const RED_PERCENT = parseInt(
  process.env.NEXT_PUBLIC_SLA_WARNING_RED_PERCENTAGE ?? '80',
  10
);

interface UseSlaCountdownParams {
  slaDeadlineAt: string | null;
  slaPausedAt: string | null;
  slaPauseAccumulatedSeconds: number;
  acceptedAt: string | null;
  slaBreached: boolean;
  priceReviewStatus?: string | null;
  clarificationStatus?: string | null;
}

function computeState(params: UseSlaCountdownParams): SlaTimerState | null {
  const {
    slaDeadlineAt,
    slaPausedAt,
    slaPauseAccumulatedSeconds,
    acceptedAt,
    slaBreached,
    priceReviewStatus,
    clarificationStatus,
  } = params;

  if (!slaDeadlineAt || !acceptedAt) return null;

  const result = computeSlaTimerState(
    slaDeadlineAt,
    slaPausedAt,
    slaPauseAccumulatedSeconds,
    acceptedAt,
    slaBreached,
    AMBER_PERCENT,
    RED_PERCENT
  );

  if (result) {
    result.pauseReason = slaPauseReason({
      price_review_status: priceReviewStatus,
      clarification_status: clarificationStatus,
    });
  }

  return result;
}

export function useSlaCountdown(params: UseSlaCountdownParams): SlaTimerState | null {
  const {
    slaDeadlineAt,
    slaPausedAt,
    slaPauseAccumulatedSeconds,
    acceptedAt,
    slaBreached,
    priceReviewStatus,
    clarificationStatus,
  } = params;

  const [state, setState] = useState<SlaTimerState | null>(() => computeState(params));
  const prevPhaseRef = useRef<SlaPhase | null>(null);

  const tick = useCallback(() => {
    const result = computeState({
      slaDeadlineAt,
      slaPausedAt,
      slaPauseAccumulatedSeconds,
      acceptedAt,
      slaBreached,
      priceReviewStatus,
      clarificationStatus,
    });

    if (result) {
      // Browser notification on phase transition to red
      if (
        result.phase === 'red' &&
        prevPhaseRef.current !== 'red' &&
        prevPhaseRef.current !== 'breached' &&
        prevPhaseRef.current !== null &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('SLA Warning', {
          body: 'Sourcing time running low — hurry up!',
          icon: '/icons/icon-192x192.png',
        });
      }

      prevPhaseRef.current = result.phase;
    }

    setState(result);
  }, [
    slaDeadlineAt,
    slaPausedAt,
    slaPauseAccumulatedSeconds,
    acceptedAt,
    slaBreached,
    priceReviewStatus,
    clarificationStatus,
  ]);

  useEffect(() => {
    if (!slaDeadlineAt || !acceptedAt) return;

    const isPaused = slaPausedAt !== null;
    const intervalMs = isPaused ? 5000 : 1000;
    const intervalId = setInterval(tick, intervalMs);

    return () => clearInterval(intervalId);
  }, [tick, slaDeadlineAt, acceptedAt, slaPausedAt]);

  return state;
}
