'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RunnerShift, RunnerFloat } from '@/lib/types/database';

interface RunnerShiftState {
  shift: RunnerShift | null;
  float: RunnerFloat | null;
  isLoading: boolean;
  error: string | null;
}

async function fetchRunnerShiftState(): Promise<{
  shift: RunnerShift | null;
  float: RunnerFloat | null;
}> {
  const [shiftRes, floatRes] = await Promise.all([
    fetch('/api/runner/shift'),
    fetch('/api/runner/float'),
  ]);

  const shiftData = await shiftRes.json();
  const floatData = await floatRes.json();

  return {
    shift: shiftData.shift || null,
    float: floatData.float || null,
  };
}

export function useRunnerShift() {
  const [state, setState] = useState<RunnerShiftState>({
    shift: null,
    float: null,
    isLoading: true,
    error: null,
  });
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchRunnerShiftState()
      .then(({ shift, float }) => {
        if (!cancelled) {
          setState({
            shift,
            float,
            isLoading: false,
            error: null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: 'Failed to load shift data',
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const reloadShiftState = useCallback(async () => {
    try {
      const { shift, float } = await fetchRunnerShiftState();
      setState({
        shift,
        float,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: 'Failed to load shift data',
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    setReloadNonce((n) => n + 1);
  }, []);

  const startShift = useCallback(
    async (latitude: number, longitude: number) => {
      const res = await fetch('/api/runner/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start shift');

      await reloadShiftState();
      return data.shift as RunnerShift;
    },
    [reloadShiftState]
  );

  const endShift = useCallback(
    async (notes?: string) => {
      const res = await fetch('/api/runner/shift/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end shift');

      await reloadShiftState();
      return {
        shift: data.shift as RunnerShift,
        transferSummary: data.transferSummary as
          | { transferred: number; reassigned: number; orphaned: number }
          | undefined,
      };
    },
    [reloadShiftState]
  );

  return {
    ...state,
    startShift,
    endShift,
    refresh,
  };
}
