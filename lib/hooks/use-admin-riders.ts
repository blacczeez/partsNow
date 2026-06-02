'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminRider {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  active_deliveries: number;
  total_completed: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminRiders() {
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRiders = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/riders?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRiders(data.riders);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiders(page);
  }, [page, fetchRiders]);

  return { riders, pagination, isLoading, page, setPage, refresh: () => fetchRiders(page) };
}
