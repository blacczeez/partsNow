'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';

interface AdminPart {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  oem_code: string | null;
  average_price: number | null;
  weight_kg: number | null;
  image_url: string | null;
  compatible_vehicles: unknown[];
  is_active: boolean;
  vendor_count: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function fetchPartsPage(page: number, search: string, category: string) {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const res = await fetch(`/api/admin/parts?${params}`);
  if (res.ok) {
    return res.json();
  }
  return null;
}

export function useAdminParts() {
  const { values, setUrlState } = useAdminUrlState(['search', 'category']);
  const page = parseInt(values.page || '1', 10);
  const search = values.search;
  const category = values.category;

  const [parts, setParts] = useState<AdminPart[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const setPage = useCallback(
    (value: number | ((prev: number) => number)) => {
      const next = typeof value === 'function' ? value(page) : value;
      setIsLoading(true);
      setUrlState({ page: next });
    },
    [page, setUrlState]
  );

  const setSearch = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ search: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  const setCategory = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ category: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  const refreshParts = useCallback(async (p: number, s: string, c: string) => {
    setIsLoading(true);
    try {
      const data = await fetchPartsPage(p, s, c);
      if (data) {
        setParts(data.parts);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadParts() {
      try {
        const data = await fetchPartsPage(page, search, category);
        if (!cancelled && data) {
          setParts(data.parts);
          setPagination(data.pagination);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadParts();

    return () => {
      cancelled = true;
    };
  }, [page, search, category]);

  const createPart = async (data: {
    name: string;
    category: string;
    subcategory?: string;
    oem_code?: string;
    average_price?: number;
    weight_kg?: number;
    image_url?: string;
    compatible_vehicles?: unknown[];
  }) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await refreshParts(page, search, category);
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updatePart = async (partId: string, data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await refreshParts(page, search, category);
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    parts,
    pagination,
    isLoading,
    actionLoading,
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    createPart,
    updatePart,
    refresh: () => refreshParts(page, search, category),
  };
}
