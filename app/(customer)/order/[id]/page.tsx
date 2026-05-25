'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { PricingSummary } from '@/components/orders/pricing-summary';
import { RatingForm } from '@/components/orders/rating-form';
import { useOrder } from '@/lib/hooks/use-order';
import { useRealtimeOrder } from '@/lib/hooks/use-realtime-order';
import { OrderStatusLive } from '@/components/tracking/order-status-live';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import type { OrderStatus } from '@/lib/types/database';

function OrderDetailContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');
  const { order, isLoading, error, refresh } = useOrder(orderId);
  const { order: realtimeOrder, isConnected } = useRealtimeOrder(orderId);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Apply realtime status updates
  const currentStatus = (realtimeOrder?.status ?? order?.status) as OrderStatus | undefined;

  // Refresh full order data when status changes via realtime
  useEffect(() => {
    if (realtimeOrder?.status && order?.status && realtimeOrder.status !== order.status) {
      refresh();
    }
  }, [realtimeOrder?.status, order?.status, refresh]);

  // Handle Paystack return for card payments
  useEffect(() => {
    if (!reference) return;

    async function verifyPayment() {
      setVerifying(true);
      try {
        // The webhook should handle this, but we also poll
        await new Promise((r) => setTimeout(r, 2000));
        refresh();
        toast('success', 'Payment received!');
      } finally {
        setVerifying(false);
        window.history.replaceState({}, '', `/order/${orderId}`);
      }
    }

    verifyPayment();
  }, [reference, orderId, refresh]);

  async function handleCancel() {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Cancel failed');
      }
      toast('success', 'Order cancelled');
      setShowCancelModal(false);
      refresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleRate(rating: number, comment: string) {
    const res = await fetch(`/api/orders/${orderId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Rating failed');
    }
    toast('success', 'Thank you for your feedback!');
    refresh();
  }

  if (isLoading || verifying) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-20">
        <AlertTriangle className="h-12 w-12 text-slate-300" />
        <p className="text-sm text-slate-500">{error || 'Order not found'}</p>
        <Button variant="secondary" onClick={() => router.push('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const liveStatus = currentStatus ?? order.status;
  const canCancel = ['pending', 'confirmed'].includes(liveStatus);
  const canRate = liveStatus === 'delivered' && !order.rating;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/orders" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-slate-500">{order.order_number}</p>
        </div>
        <OrderStatusLive
          orderId={orderId}
          initialStatus={order.status as OrderStatus}
        />
      </div>

      <div className="space-y-4 p-4">
        {/* Timeline */}
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <OrderTimeline
            currentStatus={liveStatus}
            timestamps={{
              created_at: order.created_at,
              confirmed_at: order.confirmed_at,
              sourcing_started_at: order.sourcing_started_at,
              picked_at: order.picked_at,
              dispatched_at: order.dispatched_at,
              delivered_at: order.delivered_at,
              cancelled_at: order.cancelled_at,
            }}
          />
        </div>

        {/* Order Items */}
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Items</h3>
          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Package className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(item.selling_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Payment</h3>
          <PricingSummary
            pricing={{
              subtotal: order.subtotal,
              markupAmount: order.markup_amount,
              deliveryFee: order.delivery_fee,
              discountAmount: order.discount_amount,
              total: order.total,
            }}
          />
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="text-xs text-slate-500">
              Method: {order.payment_method.toUpperCase()} | Status:{' '}
              {order.payment_status}
            </p>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-900">Delivery</h3>
          <p className="text-sm text-slate-600">{order.delivery_address}</p>
          {order.delivery_notes && (
            <p className="mt-1 text-xs text-slate-400">
              Note: {order.delivery_notes}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Ordered {formatRelativeTime(order.created_at)}
          </p>
        </div>

        {/* Rating */}
        {canRate && <RatingForm onSubmit={handleRate} />}

        {order.rating && (
          <div className="rounded-card border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-900">Your Rating</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={
                    star <= order.rating!
                      ? 'text-amber-400'
                      : 'text-slate-200'
                  }
                >
                  ★
                </span>
              ))}
            </div>
            {order.rating_comment && (
              <p className="mt-1 text-sm text-slate-500">
                {order.rating_comment}
              </p>
            )}
          </div>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <Button
            variant="destructive"
            fullWidth
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order"
      >
        <p className="mb-4 text-sm text-slate-600">
          Are you sure you want to cancel this order? This action cannot be
          undone.
          {order.payment_status === 'paid' &&
            order.payment_method === 'wallet' &&
            ` Your wallet will be refunded ${formatCurrency(order.total)}.`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowCancelModal(false)}
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            fullWidth
            isLoading={isCancelling}
            onClick={handleCancel}
          >
            Cancel Order
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrderDetailContent orderId={id} />
    </Suspense>
  );
}
