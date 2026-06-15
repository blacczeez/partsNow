'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RunnerShiftListItem } from '@/lib/services/runner';

interface ShiftHistoryState {
  shifts: RunnerShiftListItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useRunnerShiftHistory(page = 1) {
  const [state, setState] = useState<ShiftHistoryState>({
    shifts: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const fetchHistory = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`/api/runner/shifts?page=${page}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load shifts');

      setState({
        shifts: data.shifts ?? [],
        total: data.total ?? 0,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load shifts',
      }));
    }
  }, [page]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { ...state, refresh: fetchHistory };
}
