'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  markup_amount: number;
  delivery_fee: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_type: string;
  delivery_notes: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  source_channel: string;
  created_at: string;
  confirmed_at: string | null;
  sourcing_started_at: string | null;
  picked_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  promised_delivery_minutes: number | null;
  actual_delivery_minutes: number | null;
  rating: number | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    vendor_price: number | null;
    selling_price: number;
    is_found: boolean;
    is_unavailable: boolean;
    unavailable_reason: string | null;
  }>;
  assignments: Array<{
    id: string;
    assignee_id: string;
    assignee_name: string;
    assignee_phone: string;
    role: string;
    status: string;
    assigned_at: string;
    accepted_at: string | null;
    completed_at: string | null;
  }>;
  customer: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    loyalty_tier: string;
  } | null;
  tracking: {
    current_latitude: number | null;
    current_longitude: number | null;
    eta_minutes: number | null;
  } | null;
  deliveryAttempts: Array<{
    attempt_number: number;
    status: string;
    failure_reason: string | null;
    attempted_at: string;
  }>;
  paymentEvents: Array<{
    type: string;
    amount: number;
    provider: string | null;
    status: string;
    created_at: string;
  }>;
}

export function useAdminOrderDetail(orderId: string | null) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const reassign = async (role: 'runner' | 'rider', assigneeId: string) => {
    if (!orderId) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, assigneeId }),
      });
      if (res.ok) {
        await fetchOrder();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const cancel = async (reason: string) => {
    if (!orderId) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        await fetchOrder();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const refund = async () => {
    if (!orderId) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchOrder();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { order, isLoading, actionLoading, reassign, cancel, refund, refresh: fetchOrder };
}
