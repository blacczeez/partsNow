'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RiderHistoryEntry } from '@/lib/services/rider';

export function useRiderHistory() {
  const [deliveries, setDeliveries] = useState<RiderHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (pageNum: number) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/rider/history?page=${pageNum}&limit=10`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch history');

      if (pageNum === 1) {
        setDeliveries(data.deliveries || []);
      } else {
        setDeliveries((prev) => [...prev, ...(data.deliveries || [])]);
      }
      setTotalPages(data.pagination?.totalPages ?? 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage);
    }
  }, [page, totalPages, fetchHistory]);

  return {
    deliveries,
    isLoading,
    error,
    page,
    totalPages,
    hasMore: page < totalPages,
    loadMore,
  };
}
