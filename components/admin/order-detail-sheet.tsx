'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useAdminOrderDetail } from '@/lib/hooks/use-admin-order-detail';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import {
  customerPartsTotal,
  listedLineTotal,
  quotedServiceFeeLine,
  runnerSourcingTargetTotal,
} from '@/lib/utils/order-pricing-display';
import { toast } from '@/components/ui/toast';
import { ReassignSheet } from './reassign-sheet';
import { PriceReviewPanel } from './price-review-panel';
import { DeliverySettlementPanel } from './delivery-settlement-panel';
import { SourcingEscalationPanel } from './sourcing-escalation-panel';
import { canAdminReassignRider } from '@/lib/constants/order-status';
import { formatDeliveryFailureReason } from '@/lib/constants/delivery-failure';
import { parseRunnerUnavailableRejection } from '@/lib/constants/runner-unavailable';
import { OrderVehicleSummary } from '@/components/orders/order-vehicle-summary';
import type { OrderStatus } from '@/lib/types/database';

interface OrderDetailSheetProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({ orderId, isOpen, onClose }: OrderDetailSheetProps) {
  const {
    order,
    isLoading,
    actionLoading,
    reassign,
    cancel,
    refund,
    resolvePriceReview,
    retrySourcingAssign,
    messageCustomerAboutSourcing,
    dismissSourcingEscalation,
    refresh,
  } = useAdminOrderDetail(orderId);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignRole, setReassignRole] = useState<'runner' | 'rider'>('runner');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!isOpen) return null;

  const handleReassign = async (assigneeId: string) => {
    const success = await reassign(reassignRole, assigneeId);
    if (success) {
      toast('success', `${reassignRole === 'runner' ? 'Runner' : 'Rider'} reassigned`);
      setReassignOpen(false);
    } else {
      toast('error', 'Failed to reassign');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }
    setCancelError('');
    const success = await cancel(cancelReason);
    if (success) {
      toast('success', 'Order cancelled');
      setShowCancelForm(false);
      setCancelReason('');
    } else {
      setCancelError('Failed to cancel order. Try again.');
    }
  };

  const handleRefund = async () => {
    const success = await refund();
    if (success) {
      toast('success', 'Refund processed');
    } else {
      toast('error', 'Failed to process refund');
    }
  };

  const handleSendToCustomer = async (itemId: string) => {
    const success = await resolvePriceReview(itemId, 'send_to_customer');
    if (success) {
      toast('success', 'Customer notified — awaiting top-up or cancellation');
    } else {
      toast('error', 'Failed to notify customer');
    }
  };

  const handleRejectPrice = async (itemId: string) => {
    const reason = window.prompt('Reason for rejecting this item (optional):') ?? undefined;
    const success = await resolvePriceReview(itemId, 'reject_item', reason);
    if (success) {
      toast('success', 'Item rejected — runner must resolve or complete without it');
    } else {
      toast('error', 'Failed to reject item');
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={order?.order_number || 'Order Details'}
        closeOnBackdropClick={!showCancelForm}
      >
        {isLoading || !order ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-20 rounded bg-slate-100" />
            <div className="h-20 rounded bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status & Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status as OrderStatus} />
              {order.price_review_status === 'pending' && (
                <Badge variant="warning">Admin review</Badge>
              )}
              {order.price_review_status === 'awaiting_customer' && (
                <Badge variant="warning">Awaiting customer</Badge>
              )}
              {order.delivery_resolution === 'admin_review' && (
                <Badge variant="warning">Delivery escalation</Badge>
              )}
              {order.sourcingSummary?.isEscalated && (
                <Badge variant="warning">Sourcing escalation</Badge>
              )}
              {order.delivery_resolution === 'retry' && (
                <Badge variant="warning">Delivery retry</Badge>
              )}
              {order.parts_custody === 'with_rider' && (
                <Badge variant="error">Parts with rider</Badge>
              )}
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                {order.payment_status}
              </Badge>
              <span className="text-sm text-slate-500">{formatRelativeTime(order.created_at)}</span>
            </div>

            {/* Customer */}
            {order.customer && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">Customer</h4>
                <p className="text-sm font-medium text-slate-900">{order.customer.full_name}</p>
                <p className="text-sm text-slate-500">{order.customer.phone}</p>
                <Badge className="mt-1">{order.customer.loyalty_tier}</Badge>
                {order.vehicle && (
                  <OrderVehicleSummary className="mt-3" vehicle={order.vehicle} />
                )}
              </div>
            )}

            {order.price_review_status === 'pending' && (
              <PriceReviewPanel
                items={order.items}
                deliveryFee={order.delivery_fee}
                discountAmount={order.discount_amount}
                orderTotal={order.total}
                actionLoading={actionLoading}
                onSendToCustomer={handleSendToCustomer}
                onReject={handleRejectPrice}
              />
            )}

            {order.price_review_status === 'awaiting_customer' && (
              <p className="text-sm text-slate-600">
                Customer must pay {formatCurrency(order.price_topup_amount)} extra or
                cancel for a full refund of{' '}
                {formatCurrency(order.original_total ?? order.total)}.
              </p>
            )}

            {order.sourcingSummary?.isEscalated && (
              <SourcingEscalationPanel
                orderId={order.id}
                orderNumber={order.order_number}
                escalationReason={order.sourcing_escalation_reason}
                summary={order.sourcingSummary}
                actionLoading={actionLoading}
                onRetryAssign={retrySourcingAssign}
                onMessageCustomer={messageCustomerAboutSourcing}
                onDismiss={dismissSourcingEscalation}
                onReassignRunner={() => {
                  setReassignRole('runner');
                  setReassignOpen(true);
                }}
                onCancel={() => setShowCancelForm(true)}
                onUpdated={refresh}
              />
            )}

            {/* Items */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Items</h4>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-button bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {item.quantity}x {item.description}
                      </p>
                      {item.vendor_price != null && (
                        <p className="text-xs text-slate-400">
                          Vendor paid: {formatCurrency(item.vendor_price * item.quantity)}
                          {item.expected_vendor_price != null && (
                            <> · Target budget: {formatCurrency(item.expected_vendor_price * item.quantity)}</>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(listedLineTotal(item))}
                      </p>
                      <p className="text-xs text-slate-400">
                        + {formatCurrency(quotedServiceFeeLine(item))} fee
                      </p>
                      {item.is_unavailable && (
                        <>
                          <Badge variant="error" className="mt-0.5">N/A</Badge>
                          {item.unavailable_reason && (
                            <p className="mt-0.5 max-w-[140px] text-xs text-error">
                              {item.unavailable_reason}
                            </p>
                          )}
                        </>
                      )}
                      {!item.is_unavailable && item.price_review_status === 'pending' && (
                        <Badge variant="warning" className="mt-0.5">Price review</Badge>
                      )}
                      {!item.is_unavailable && item.price_review_status === 'customer_approved' && (
                          <Badge variant="success" className="mt-0.5">Customer approved</Badge>
                        )}
                      {!item.is_unavailable &&
                        item.is_found &&
                        item.price_review_status === 'awaiting_customer' && (
                          <Badge variant="warning" className="mt-0.5">Awaiting customer</Badge>
                        )}
                      {!item.is_unavailable &&
                        item.is_found &&
                        item.price_review_status !== 'pending' &&
                        item.price_review_status !== 'customer_approved' &&
                        item.price_review_status !== 'awaiting_customer' && (
                          <Badge variant="success" className="mt-0.5">Found</Badge>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Pricing</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Parts (customer)</span>
                  <span>{formatCurrency(customerPartsTotal(order.items))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Parts (vendor est.)</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service fee</span>
                  <span>{formatCurrency(order.markup_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target sourcing budget</span>
                  <span>{formatCurrency(runnerSourcingTargetTotal(order.items))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount</span>
                    <span className="text-success">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                {order.price_topup_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Price adjustment</span>
                    <span>{formatCurrency(order.price_topup_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                  <span>Customer total</span>
                  <span>{formatCurrency(order.revised_total ?? order.total)}</span>
                </div>
              </div>
            </div>

            {order.deliveryAttempts.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  Delivery Attempts
                </h4>
                <div className="space-y-2">
                  {order.deliveryAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="rounded-button border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">
                          Attempt #{attempt.attempt_number}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatRelativeTime(attempt.attempted_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {attempt.failure_reason
                          ? formatDeliveryFailureReason(attempt.failure_reason)
                          : attempt.status}
                      </p>
                      {attempt.call_attempts_made != null && attempt.call_attempts_made > 0 && (
                        <p className="text-xs text-slate-500">
                          Calls logged: {attempt.call_attempts_made}
                        </p>
                      )}
                      {attempt.notes && (
                        <p className="mt-1 text-xs text-slate-500">{attempt.notes}</p>
                      )}
                      {attempt.photo_url && (
                        <a
                          href={attempt.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-primary"
                        >
                          View photo evidence
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.delivery_resolution === 'admin_review' && (
              <p className="rounded-button border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Rider escalated a delivery issue. Reassign rider, update the address with the
                customer, or cancel the order.
              </p>
            )}

            <DeliverySettlementPanel
              orderId={order.id}
              settlementStatus={order.settlement_status ?? null}
              settlementFault={order.settlement_fault ?? null}
              partsCustody={order.parts_custody ?? null}
              partsRecoveryRate={order.parts_recovery_rate ?? null}
              settlementRefundAmount={order.settlement_refund_amount ?? null}
              settlementCompletedAt={order.settlement_completed_at ?? null}
              orderStatus={order.status}
              onUpdated={refresh}
            />

            {/* Assignments */}
            {order.assignments.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Assignments</h4>
                <div className="space-y-2">
                  {order.assignments.map((a) => {
                    const unavailableRejection = parseRunnerUnavailableRejection(
                      a.rejection_reason
                    );
                    return (
                    <div key={a.id} className="flex items-center justify-between rounded-button bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.assignee_name}</p>
                        <p className="text-xs text-slate-400">{a.role} - {a.assignee_phone}</p>
                        {unavailableRejection && (
                          <p className="mt-0.5 text-xs text-error">
                            Unavailable: {unavailableRejection.reason}
                          </p>
                        )}
                        {!unavailableRejection && a.rejection_reason && a.status === 'failed' && (
                          <p className="mt-0.5 text-xs text-slate-500">{a.rejection_reason}</p>
                        )}
                      </div>
                      <Badge variant={a.status === 'completed' ? 'success' : a.status === 'failed' ? 'error' : 'primary'}>
                        {a.status}
                      </Badge>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Info */}
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">Delivery</h4>
              {order.total_weight_kg != null && (
                <p className="text-sm text-slate-700">
                  {order.total_weight_kg} kg
                  {order.delivery_tier ? ` · ${order.delivery_tier} tier` : ''}
                  {order.delivery_vehicle_type ? ` · ${order.delivery_vehicle_type}` : ''}
                </p>
              )}
              <p className="text-sm text-slate-700">{order.delivery_address}</p>
              <p className="text-xs text-slate-400">{order.delivery_type} - {order.payment_method}</p>
              {order.delivery_notes && <p className="mt-1 text-xs text-slate-500">Notes: {order.delivery_notes}</p>}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Timeline</h4>
              <div className="space-y-1 text-xs text-slate-500">
                <p>Created: {new Date(order.created_at).toLocaleString()}</p>
                {order.confirmed_at && <p>Confirmed: {new Date(order.confirmed_at).toLocaleString()}</p>}
                {order.sourcing_started_at && <p>Sourcing: {new Date(order.sourcing_started_at).toLocaleString()}</p>}
                {order.picked_at && <p>Picked: {new Date(order.picked_at).toLocaleString()}</p>}
                {order.dispatched_at && <p>Dispatched: {new Date(order.dispatched_at).toLocaleString()}</p>}
                {order.delivered_at && <p>Delivered: {new Date(order.delivered_at).toLocaleString()}</p>}
                {order.cancelled_at && <p>Cancelled: {new Date(order.cancelled_at).toLocaleString()}</p>}
              </div>
            </div>

            {/* Actions */}
            {!['delivered', 'cancelled', 'failed', 'rejected'].includes(order.status) && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                {order.price_review_status === 'pending' && (
                  <p className="text-xs text-warning">
                    Resolve price review before reassigning or cancelling.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={order.price_review_status === 'pending'}
                    onClick={() => { setReassignRole('runner'); setReassignOpen(true); }}
                  >
                    Reassign Runner
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={
                      order.price_review_status === 'pending' ||
                      !canAdminReassignRider(order.status as OrderStatus)
                    }
                    onClick={() => { setReassignRole('rider'); setReassignOpen(true); }}
                  >
                    Reassign Rider
                  </Button>
                </div>
                {!showCancelForm ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    fullWidth
                    onClick={() => setShowCancelForm(true)}
                  >
                    Cancel Order
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => {
                        setCancelReason(e.target.value);
                        if (cancelError) setCancelError('');
                      }}
                      placeholder="Reason for cancellation..."
                      className="w-full rounded-button border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={2}
                    />
                    {cancelError && <p className="text-sm text-error">{cancelError}</p>}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setShowCancelForm(false); setCancelReason(''); }}>
                        Back
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" isLoading={actionLoading} onClick={handleCancel}>
                        Confirm Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {order.status === 'cancelled' && order.payment_status === 'paid' && (
              <div className="border-t border-slate-200 pt-4">
                <Button variant="secondary" size="sm" fullWidth isLoading={actionLoading} onClick={handleRefund}>
                  Process Full Refund
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <ReassignSheet
        isOpen={reassignOpen}
        onClose={() => setReassignOpen(false)}
        role={reassignRole}
        onConfirm={handleReassign}
        isLoading={actionLoading}
      />
    </>
  );
}
