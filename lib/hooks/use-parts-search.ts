'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Part } from '@/lib/types/database';

interface UsePartsSearchOptions {
  initialQuery?: string;
  initialCategory?: string;
}

interface UsePartsSearchReturn {
  results: Part[];
  isLoading: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  query: string;
  setQuery: (q: string) => void;
  category: string;
  setCategory: (c: string) => void;
}

export function usePartsSearch(
  options: UsePartsSearchOptions = {}
): UsePartsSearchReturn {
  const [query, setQuery] = useState(options.initialQuery || '');
  const [category, setCategory] = useState(options.initialCategory || '');
  const [results, setResults] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const abortRef = useRef<AbortController>(undefined);

  const fetchParts = useCallback(
    async (pageNum: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (category) params.set('category', category);
        params.set('page', String(pageNum));
        params.set('limit', '20');

        const res = await fetch(`/api/inventory/search?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        setResults((prev) => (append ? [...prev, ...data.parts] : data.parts));
        setTotal(data.pagination.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResults((prev) => (append ? prev : []));
      } finally {
        setIsLoading(false);
      }
    },
    [query, category]
  );

  // Reset and fetch on query/category change
  useEffect(() => {
    setPage(1);
    fetchParts(1, false);
  }, [fetchParts]);

  // Cleanup
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const hasMore = results.length < total;

  function loadMore() {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchParts(nextPage, true);
  }

  return {
    results,
    isLoading,
    hasMore,
    total,
    loadMore,
    query,
    setQuery,
    category,
    setCategory,
  };
}
