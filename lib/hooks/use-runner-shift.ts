'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RunnerShift, RunnerFloat } from '@/lib/types/database';

interface RunnerShiftState {
  shift: RunnerShift | null;
  float: RunnerFloat | null;
  isLoading: boolean;
  error: string | null;
}

export function useRunnerShift() {
  const [state, setState] = useState<RunnerShiftState>({
    shift: null,
    float: null,
    isLoading: true,
    error: null,
  });

  const fetchState = useCallback(async () => {
    try {
      const [shiftRes, floatRes] = await Promise.all([
        fetch('/api/runner/shift'),
        fetch('/api/runner/float'),
      ]);

      const shiftData = await shiftRes.json();
      const floatData = await floatRes.json();

      setState({
        shift: shiftData.shift || null,
        float: floatData.float || null,
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

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const startShift = useCallback(
    async (latitude: number, longitude: number) => {
      const res = await fetch('/api/runner/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start shift');

      await fetchState();
      return data.shift as RunnerShift;
    },
    [fetchState]
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

      await fetchState();
      return data.shift as RunnerShift;
    },
    [fetchState]
  );

  return {
    ...state,
    startShift,
    endShift,
    refresh: fetchState,
  };
}
