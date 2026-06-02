'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = useCallback(async (p: number, t: string, s: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (t) params.set('type', t);
      if (s) params.set('status', s);

      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(page, type, status);
  }, [page, type, status, fetchPayments]);

  return { payments, pagination, isLoading, page, setPage, type, setType, status, setStatus };
}
