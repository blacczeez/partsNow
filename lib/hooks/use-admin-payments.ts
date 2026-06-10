'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';

interface AdminPayment {
  id: string;
  order_id: string | null;
  wallet_id: string | null;
  type: string;
  amount: number;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminPayments() {
  const { values, setUrlState } = useAdminUrlState(['type', 'status']);
  const page = parseInt(values.page || '1', 10);
  const type = values.type;
  const status = values.status;

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const setPage = useCallback(
    (value: number) => {
      setIsLoading(true);
      setUrlState({ page: value });
    },
    [setUrlState]
  );

  const setType = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ type: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  const setStatus = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ status: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchPayments() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (type) params.set('type', type);
        if (status) params.set('status', status);

        const res = await fetch(`/api/admin/payments?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setPayments(data.payments);
          setPagination(data.pagination);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchPayments();
    return () => {
      cancelled = true;
    };
  }, [page, type, status]);

  return { payments, pagination, isLoading, page, setPage, type, setType, status, setStatus };
}
