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
import { PriceChangeBanner } from '@/components/orders/price-change-notice';
import { RatingForm } from '@/components/orders/rating-form';
import { useOrder } from '@/lib/hooks/use-order';
import { useUser } from '@/lib/hooks/use-user';
import { OrderStatusLive } from '@/components/tracking/order-status-live';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import {
  catalogLineTotal,
  catalogUnitPrice,
} from '@/lib/utils/order-pricing-display';
import { toast } from '@/components/ui/toast';
import { formatDeliveryFailureReason } from '@/lib/constants/delivery-failure';
import { DeliverySettlementSummary } from '@/components/orders/delivery-settlement-summary';
import { DeliveryFeeBreakdownPanel } from '@/components/orders/delivery-fee-breakdown';
import { OrderVehicleSummary } from '@/components/orders/order-vehicle-summary';
import type { OrderStatus } from '@/lib/types/database';

function OrderDetailContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');
  const { order, isLoading, error, refresh } = useOrder(orderId);
  const { wallet, refresh: refreshUser } = useUser();
  const fetchedStatus = order?.status as OrderStatus | undefined;
  const [realtimeStatus, setRealtimeStatus] = useState<OrderStatus | null>(null);
  const [prevFetchedStatus, setPrevFetchedStatus] = useState<OrderStatus | undefined>();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [priceActionLoading, setPriceActionLoading] = useState(false);

  if (fetchedStatus !== prevFetchedStatus) {
    setPrevFetchedStatus(fetchedStatus);
    setRealtimeStatus(null);
  }

  useEffect(() => {
    if (realtimeStatus && fetchedStatus && realtimeStatus !== fetchedStatus) {
      refresh();
    }
  }, [realtimeStatus, fetchedStatus, refresh]);

  function handleLiveStatusChange(status: OrderStatus) {
    setRealtimeStatus(status);
  }

  // Handle Paystack return for card payments
  useEffect(() => {
    if (!reference) return;

    async function verifyPayment() {
      setVerifying(true);
      try {
        // The webhook should handle this, but we also poll
        await new Promise((r) => setTimeout(r, 2000));
        await Promise.all([refresh(), refreshUser()]);
        toast('success', 'Payment received!');
      } finally {
        setVerifying(false);
        window.history.replaceState({}, '', `/order/${orderId}`);
      }
    }

    verifyPayment();
  }, [reference, orderId, refresh, refreshUser]);

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

  async function handleAcceptPriceChange() {
    setPriceActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/price-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept price update');

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      toast('success', 'Price update accepted — your order will continue');
      refresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setPriceActionLoading(false);
    }
  }

  async function handleDiscardPriceChange() {
    if (
      !window.confirm(
        'Cancel this order and receive a full refund to your wallet?'
      )
    ) {
      return;
    }
    setPriceActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/price-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
      toast('success', 'Order cancelled — full refund credited to your wallet');
      refresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setPriceActionLoading(false);
    }
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

  const displayStatus = (realtimeStatus ?? fetchedStatus) as OrderStatus;
  const canCancel = ['pending', 'confirmed'].includes(displayStatus);
  const canRate = displayStatus === 'delivered' && !order.rating;
  const isDeliveryTerminal = ['failed', 'rejected'].includes(displayStatus);
  const latestAttempt = (
    order as {
      delivery_attempts?: Array<{
        failure_reason: string | null;
        notes: string | null;
      }>;
    }
  ).delivery_attempts?.[0];

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:top-[6.5rem]">
        <Link href="/orders" className="rounded-button p-1 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-slate-500">{order.order_number}</p>
        </div>
        <OrderStatusLive
          orderId={orderId}
          initialStatus={order.status as OrderStatus}
          onStatusChange={handleLiveStatusChange}
        />
      </div>

      <div className="space-y-4 p-4">
        {isDeliveryTerminal && (
          <div className="rounded-card border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-900">
              {displayStatus === 'rejected'
                ? 'Delivery was refused'
                : 'Delivery could not be completed'}
            </h3>
            <p className="mt-1 text-sm text-red-800">
              {latestAttempt?.failure_reason
                ? formatDeliveryFailureReason(latestAttempt.failure_reason)
                : 'Our team has been notified.'}
            </p>
            {latestAttempt?.notes && (
              <p className="mt-2 text-xs text-red-700">{latestAttempt.notes}</p>
            )}
          </div>
        )}

        <DeliverySettlementSummary
          settlementStatus={
            (order as { settlement_status?: string | null }).settlement_status ?? null
          }
          settlementRefundAmount={
            (order as { settlement_refund_amount?: number | null }).settlement_refund_amount ??
            null
          }
          settlementBreakdown={
            (order as { settlement_breakdown?: Record<string, unknown> | null })
              .settlement_breakdown ?? null
          }
          paymentStatus={order.payment_status}
        />

        {(order as { delivery_resolution?: string }).delivery_resolution ===
          'admin_review' && (
          <div className="rounded-card border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              Delivery issue under review
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              Our team is reviewing a delivery problem and will contact you shortly.
            </p>
          </div>
        )}

        {order.price_review_status === 'awaiting_customer' && (
          <PriceChangeBanner
            orderNumber={order.order_number}
            originalTotal={order.original_total ?? order.total}
            revisedTotal={order.revised_total ?? order.total}
            topUpAmount={order.price_topup_amount ?? 0}
            paymentMethod={order.payment_method}
            walletBalance={wallet?.balance}
            isSubmitting={priceActionLoading}
            onAccept={handleAcceptPriceChange}
            onDiscard={handleDiscardPriceChange}
          />
        )}

        {/* Timeline */}
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <OrderTimeline
            currentStatus={displayStatus}
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
                  <p className="text-xs text-slate-500">
                    Qty: {item.quantity} ·{' '}
                    {formatCurrency(
                      catalogUnitPrice(item, order.subtotal, order.markup_amount)
                    )}{' '}
                    each
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(
                    catalogLineTotal(item, order.subtotal, order.markup_amount)
                  )}
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
              total: order.revised_total ?? order.total,
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
          {order.vehicle && (
            <OrderVehicleSummary className="mb-3" vehicle={order.vehicle} />
          )}
          {order.total_weight_kg != null && (
            <p className="mb-2 text-sm text-slate-600">
              {order.total_weight_kg} kg
              {order.delivery_tier
                ? ` · ${String(order.delivery_tier).charAt(0).toUpperCase()}${String(order.delivery_tier).slice(1)}`
                : ''}
              {order.delivery_vehicle_type
                ? ` · ${order.delivery_vehicle_type} dispatch`
                : ''}
            </p>
          )}
          <p className="text-sm text-slate-600">{order.delivery_address}</p>
          {order.delivery_notes && (
            <p className="mt-1 text-xs text-slate-400">
              Note: {order.delivery_notes}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Ordered {formatRelativeTime(order.created_at)}
          </p>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <DeliveryFeeBreakdownPanel
              breakdown={order.delivery_fee_breakdown}
              deliveryFee={order.delivery_fee}
              returnTo={`/order/${order.id}`}
            />
          </div>
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
        closeOnBackdropClick={false}
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
