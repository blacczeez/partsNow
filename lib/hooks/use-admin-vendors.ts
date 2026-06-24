'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminVendor {
  id: string;
  name: string;
  contact_phone: string | null;
  contact_name: string | null;
  cluster_id: string;
  cluster_name: string;
  location_in_market: string | null;
  specializations: string[];
  payment_terms: string;
  reliability_score: number;
  total_orders: number;
  quality_issues: number;
  is_active: boolean;
  verification_status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type VendorListFilter = 'all' | 'pending' | 'active';

export function useAdminVendors() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPageState] = useState(1);
  const [filter, setFilterState] = useState<VendorListFilter>('all');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filter === 'pending') params.set('verification', 'pending');
    if (filter === 'active') params.set('verification', 'active');

    fetch(`/api/admin/vendors?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          vendors: AdminVendor[];
          pagination: Pagination;
        }>;
      })
      .then((data) => {
        if (!cancelled && data) {
          setVendors(data.vendors);
          setPagination(data.pagination);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, filter, reloadNonce]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadNonce((n) => n + 1);
  }, []);

  const setPage = useCallback((p: number) => {
    setIsLoading(true);
    setPageState(p);
  }, []);

  const setFilter = useCallback((next: VendorListFilter) => {
    setIsLoading(true);
    setPageState(1);
    setFilterState(next);
  }, []);

  const createVendor = async (data: {
    name: string;
    contact_phone: string;
    contact_name?: string;
    cluster_id: string;
    location_in_market?: string;
    specializations?: string[];
    payment_terms?: string;
  }) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateVendor = async (vendorId: string, data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const activateVendor = async (
    vendorId: string,
    data: { contact_phone: string; location_in_market?: string; notes?: string }
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    vendors,
    pagination,
    isLoading,
    actionLoading,
    page,
    setPage,
    filter,
    setFilter,
    createVendor,
    updateVendor,
    activateVendor,
    refresh,
  };
}
