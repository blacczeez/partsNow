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
  total_weight_kg: number | null;
  delivery_tier: string | null;
  delivery_vehicle_type: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  price_review_status: string;
  original_total: number | null;
  price_topup_amount: number;
  revised_total: number | null;
  source_channel: string;
  created_at: string;
  confirmed_at: string | null;
  sourcing_started_at: string | null;
  picked_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  delivery_resolution: string | null;
  delivery_retry_after: string | null;
  parts_custody: string | null;
  settlement_status: string | null;
  settlement_fault: string | null;
  parts_recovery_rate: number | null;
  return_handling_fee: number | null;
  settlement_refund_amount: number | null;
  settlement_completed_at: string | null;
  promised_delivery_minutes: number | null;
  actual_delivery_minutes: number | null;
  rating: number | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    vendor_price: number | null;
    selling_price: number;
    expected_vendor_price: number | null;
    max_vendor_price: number | null;
    price_review_status: string | null;
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
    id: string;
    attempt_number: number;
    status: string;
    failure_reason: string | null;
    notes: string | null;
    photo_url: string | null;
    call_attempts_made: number | null;
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
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [prevOrderId, setPrevOrderId] = useState(orderId);
  const [actionLoading, setActionLoading] = useState(false);

  if (orderId !== prevOrderId) {
    setPrevOrderId(orderId);
    setIsLoading(Boolean(orderId));
    if (!orderId) {
      setOrder(null);
    }
  }

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refresh = useCallback(async () => {
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
        await refresh();
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
        await refresh();
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
        await refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const resolvePriceReview = async (
    itemId: string,
    action: 'send_to_customer' | 'reject_item',
    notes?: string
  ) => {
    if (!orderId) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/price-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action, notes }),
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    order,
    isLoading,
    actionLoading,
    reassign,
    cancel,
    refund,
    resolvePriceReview,
    refresh,
  };
}
