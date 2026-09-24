'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Package,
  FileText,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PricingSummary } from '@/components/orders/pricing-summary';
import { PriceChangeBanner } from '@/components/orders/price-change-notice';
import { RatingForm } from '@/components/orders/rating-form';
import { PartIssueReportForm } from '@/components/orders/part-issue-report-form';
import { useOrder } from '@/lib/hooks/use-order';
import { useUser } from '@/lib/hooks/use-user';
import { OrderStatusLive } from '@/components/tracking/order-status-live';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import { formatDeliveryFailureReason } from '@/lib/constants/delivery-failure';
import { DeliverySettlementSummary } from '@/components/orders/delivery-settlement-summary';
import { cn } from '@/lib/utils/cn';
import type { OrderStatus } from '@/lib/types/database';

/* ── Timeline config ── */

const TIMELINE_STEPS: Array<{
  status: OrderStatus;
  label: string;
  description: string;
}> = [
  { status: 'pending', label: 'Order placed', description: 'We have received your order' },
  { status: 'confirmed', label: 'Payment received', description: 'We have received your order' },
  { status: 'sourcing', label: 'Order sourced at ladipo', description: 'Runner confirmed items' },
  { status: 'picked', label: 'Handed to rider', description: 'Rider received the items' },
  { status: 'delivered', label: 'Delivered to owner', description: 'We have received your order' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  sourcing: 2,
  picked: 3,
  dispatched: 4,
  delivered: 5,
};

function formatTrackingDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) +
    ', ' +
    d.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
}

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
  const [showRefundModal, setShowRefundModal] = useState(false);
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

  useEffect(() => {
    if (!reference) return;
    async function verifyPayment() {
      setVerifying(true);
      try {
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
      await Promise.all([refresh(), refreshUser()]);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleReportPartIssues(
    reports: Array<{ itemId: string; issueSubtype: string; notes?: string }>
  ) {
    const res = await fetch(`/api/orders/${orderId}/report-parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to submit report');
    }
    toast('success', 'Part issue reported — our team will review');
    refresh();
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
      setShowRefundModal(false);
      await Promise.all([refresh(), refreshUser()]);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setPriceActionLoading(false);
    }
  }

  function copyOrderId() {
    navigator.clipboard
      .writeText(order?.order_number || orderId)
      .then(() => toast('success', 'Order ID copied'))
      .catch(() => {});
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
        <Button variant="secondary" onClick={() => router.push('/account?tab=orders')}>
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

  const currentIdx = STATUS_ORDER[displayStatus] ?? -1;
  const isCancelled = ['cancelled', 'rejected', 'failed'].includes(displayStatus);

  const timestampMap: Record<string, string | null> = {
    pending: order.created_at,
    confirmed: order.confirmed_at,
    sourcing: order.sourcing_started_at,
    picked: order.picked_at,
    dispatched: order.dispatched_at,
    delivered: order.delivered_at,
  };

  // Delivery tracking data
  const tracking = (order as { delivery_tracking?: Array<{ eta_minutes?: number | null }> })
    .delivery_tracking;
  const eta = tracking?.[0]?.eta_minutes;

  // Rider assignment
  const riderAssignment = (
    order as {
      order_assignments?: Array<{
        role: string;
        assignee_id: string;
        status: string;
      }>;
    }
  ).order_assignments?.find((a) => a.role === 'rider');

  const itemCount = order.order_items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="px-4 pb-12 lg:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
          Track orders
        </h1>
        <div className="ml-auto">
          <OrderStatusLive
            orderId={orderId}
            initialStatus={order.status as OrderStatus}
            onStatusChange={handleLiveStatusChange}
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {isDeliveryTerminal && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
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
            (order as { settlement_refund_amount?: number | null }).settlement_refund_amount ?? null
          }
          settlementBreakdown={
            (order as { settlement_breakdown?: Record<string, unknown> | null })
              .settlement_breakdown ?? null
          }
          paymentStatus={order.payment_status}
        />

        {(order as { delivery_resolution?: string }).delivery_resolution === 'admin_review' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Delivery issue under review</h3>
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
            onDiscard={() => setShowRefundModal(true)}
          />
        )}
      </div>

      {/* Main layout */}
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── Left: Tracking ── */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Tracking order</h2>

          {/* Order ID box */}
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
            <span className="text-sm font-medium text-slate-900">
              {order.order_number}
            </span>
            <button
              type="button"
              onClick={copyOrderId}
              className="text-slate-400 hover:text-slate-600"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>

          {/* ETA banner */}
          {eta != null && displayStatus === 'dispatched' && (
            <div className="mb-6 rounded-xl bg-purple-100/60 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Arriving in ~{eta} min
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                Rider is on the way to your address
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted =
                currentIdx > STATUS_ORDER[step.status] ||
                (displayStatus === 'delivered' && step.status === 'delivered');
              const isCurrent =
                !isCancelled &&
                ((step.status === 'picked' && displayStatus === 'dispatched')
                  ? false
                  : displayStatus === step.status ||
                    (step.status === 'picked' && currentIdx === STATUS_ORDER.picked));
              const isPending = !isCompleted && !isCurrent;
              const ts = timestampMap[step.status];

              return (
                <div key={step.status} className="flex gap-4">
                  {/* Date column */}
                  <div className="w-36 shrink-0 pt-1 text-right">
                    {ts && (isCompleted || isCurrent) ? (
                      <p className="text-xs text-slate-400">
                        {formatTrackingDate(ts)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300">
                        {formatTrackingDate(order.created_at)}
                      </p>
                    )}
                  </div>

                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'h-3 w-3 shrink-0 rounded-full',
                        isCompleted || isCurrent
                          ? 'bg-green-600'
                          : 'bg-slate-300'
                      )}
                    />
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'w-px flex-1',
                          isCompleted ? 'bg-green-600' : 'border-l border-dashed border-slate-300'
                        )}
                        style={{ minHeight: '3.5rem' }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-6 pt-0">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isPending ? 'text-slate-300' : 'text-slate-900'
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        'text-xs',
                        isPending ? 'text-slate-300' : 'text-slate-400'
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {isCancelled && (
              <div className="flex gap-4">
                <div className="w-36 shrink-0 pt-1 text-right">
                  <p className="text-xs text-slate-400">
                    {formatTrackingDate(order.cancelled_at)}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 shrink-0 rounded-full bg-red-500" />
                </div>
                <div className="pt-0">
                  <p className="text-sm font-semibold text-red-600">
                    {displayStatus === 'cancelled'
                      ? 'Order cancelled'
                      : displayStatus === 'rejected'
                        ? 'Delivery refused'
                        : 'Delivery failed'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rating + issue report + receipt + cancel — below timeline */}
          <div className="mt-6 space-y-4">
            {canRate && <RatingForm onSubmit={handleRate} />}

            {order.rating && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-900">Your Rating</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={star <= order.rating! ? 'text-amber-400' : 'text-slate-200'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {order.rating_comment && (
                  <p className="mt-1 text-sm text-slate-500">{order.rating_comment}</p>
                )}
              </div>
            )}

            {displayStatus === 'delivered' && (
              <PartIssueReportForm
                items={order.order_items.map((item) => ({
                  id: item.id,
                  description: item.description,
                  is_found: (item as { is_found?: boolean }).is_found,
                  part_issue_reported: (item as { part_issue_reported?: boolean })
                    .part_issue_reported,
                }))}
                onSubmit={handleReportPartIssues}
              />
            )}

            {displayStatus === 'delivered' && (
              <Link href={`/order/${orderId}/receipt`}>
                <Button variant="secondary" fullWidth>
                  <FileText className="mr-2 h-4 w-4" />
                  View Receipt
                </Button>
              </Link>
            )}

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
        </div>

        {/* ── Right: Sidebar ── */}
        <aside className="w-full lg:w-80 lg:shrink-0">
          <div className="space-y-4">
            {/* Rider info card */}
            {riderAssignment && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    R
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Rider assigned</p>
                    <p className="text-xs text-slate-500">
                      Your order is being handled
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Your order summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Your order</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Order value</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(order.revised_total ?? order.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Order value</span>
                  <span className="font-bold text-slate-900">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Shipping fee</span>
                  <span className="text-slate-900">
                    {order.delivery_fee === 0
                      ? 'FREE'
                      : formatCurrency(order.delivery_fee)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(order.revised_total ?? order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>100% payment security</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order"
        closeOnBackdropClick={false}
      >
        <p className="mb-4 text-sm text-slate-600">
          Are you sure you want to cancel this order? This action cannot be undone.
          {order.payment_status === 'paid' &&
            order.payment_method === 'wallet' &&
            ` Your wallet will be refunded ${formatCurrency(order.total)}.`}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setShowCancelModal(false)}>
            Keep Order
          </Button>
          <Button variant="destructive" fullWidth isLoading={isCancelling} onClick={handleCancel}>
            Cancel Order
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showRefundModal}
        onClose={() => !priceActionLoading && setShowRefundModal(false)}
        title="Cancel for full refund"
        closeOnBackdropClick={!priceActionLoading}
      >
        <p className="mb-4 text-sm text-slate-600">
          Cancel this order and receive a full refund of{' '}
          {formatCurrency(order.original_total ?? order.total)} to your wallet? This action cannot
          be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            disabled={priceActionLoading}
            onClick={() => setShowRefundModal(false)}
          >
            Keep order
          </Button>
          <Button
            variant="destructive"
            fullWidth
            isLoading={priceActionLoading}
            onClick={handleDiscardPriceChange}
          >
            Cancel & refund
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
