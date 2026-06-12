'use client';

import { useState, useEffect, useRef } from 'react';
import type { CatalogPart } from '@/lib/types/catalog';

interface UsePartsSearchOptions {
  initialQuery?: string;
  initialCategory?: string;
  vehicleId?: string;
  fitMyCar?: boolean;
}

interface UsePartsSearchReturn {
  results: CatalogPart[];
  isLoading: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  query: string;
  setQuery: (q: string) => void;
  category: string;
  setCategory: (c: string) => void;
}

function buildSearchKey(
  query: string,
  category: string,
  vehicleId?: string,
  fitMyCar?: boolean
): string {
  return `${query}|${category}|${vehicleId ?? ''}|${String(fitMyCar ?? false)}`;
}

async function fetchSearchPage(
  pageNum: number,
  query: string,
  category: string,
  vehicleId: string | undefined,
  fitMyCar: boolean | undefined,
  signal: AbortSignal
): Promise<{ parts: CatalogPart[]; total: number }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (vehicleId) params.set('vehicleId', vehicleId);
  if (fitMyCar) params.set('fitMyCar', 'true');
  params.set('page', String(pageNum));
  params.set('limit', '20');

  const res = await fetch(`/api/inventory/search?${params}`, { signal });

  if (!res.ok) throw new Error('Search failed');

  const data = await res.json();
  return {
    parts: data.parts,
    total: data.pagination.total,
  };
}

export function usePartsSearch(
  options: UsePartsSearchOptions = {}
): UsePartsSearchReturn {
  const [query, setQuery] = useState(options.initialQuery || '');
  const [category, setCategory] = useState(options.initialCategory || '');
  const [results, setResults] = useState<CatalogPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const abortRef = useRef<AbortController>(undefined);

  const searchKey = buildSearchKey(
    query,
    category,
    options.vehicleId,
    options.fitMyCar
  );
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey);

  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    setPage(1);
    setResults([]);
    setTotal(0);
    setIsLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function load() {
      try {
        const data = await fetchSearchPage(
          1,
          query,
          category,
          options.vehicleId,
          options.fitMyCar,
          controller.signal
        );
        if (!cancelled) {
          setResults(data.parts);
          setTotal(data.total);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [searchKey, query, category, options.vehicleId, options.fitMyCar]);

  const hasMore = results.length < total;

  function loadMore() {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    void (async () => {
      try {
        const data = await fetchSearchPage(
          nextPage,
          query,
          category,
          options.vehicleId,
          options.fitMyCar,
          controller.signal
        );
        setResults((prev) => [...prev, ...data.parts]);
        setTotal(data.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setIsLoading(false);
      }
    })();
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
