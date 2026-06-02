'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminVendor {
  id: string;
  name: string;
  contact_phone: string;
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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminVendors() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVendors = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors(page);
  }, [page, fetchVendors]);

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
        await fetchVendors(page);
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
        await fetchVendors(page);
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { vendors, pagination, isLoading, actionLoading, page, setPage, createVendor, updateVendor, refresh: () => fetchVendors(page) };
}
