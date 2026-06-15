'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RiderHistoryEntry, RiderHistoryStats } from '@/lib/services/rider';

export function useRiderHistory() {
  const [deliveries, setDeliveries] = useState<RiderHistoryEntry[]>([]);
  const [stats, setStats] = useState<RiderHistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch('/api/rider/history?page=1&limit=10');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch history');

        if (!cancelled) {
          setDeliveries(data.deliveries || []);
          if (data.stats) setStats(data.stats);
          setTotalPages(data.pagination?.totalPages ?? 1);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch history'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (page >= totalPages) return;

    const nextPage = page + 1;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/rider/history?page=${nextPage}&limit=10`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch history');

      setDeliveries((prev) => [...prev, ...(data.deliveries || [])]);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setPage(nextPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [page, totalPages]);

  return {
    deliveries,
    stats,
    isLoading,
    error,
    page,
    totalPages,
    hasMore: page < totalPages,
    loadMore,
  };
}
