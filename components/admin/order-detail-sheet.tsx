'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useAdminOrderDetail } from '@/lib/hooks/use-admin-order-detail';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import { ReassignSheet } from './reassign-sheet';
import type { OrderStatus } from '@/lib/types/database';

interface OrderDetailSheetProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({ orderId, isOpen, onClose }: OrderDetailSheetProps) {
  const { order, isLoading, actionLoading, reassign, cancel, refund } = useAdminOrderDetail(orderId);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignRole, setReassignRole] = useState<'runner' | 'rider'>('runner');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

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
    if (!cancelReason.trim()) return;
    const success = await cancel(cancelReason);
    if (success) {
      toast('success', 'Order cancelled');
      setShowCancelForm(false);
      setCancelReason('');
    } else {
      toast('error', 'Failed to cancel order');
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

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={order?.order_number || 'Order Details'}>
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
              </div>
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
                          Vendor: {formatCurrency(item.vendor_price)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(item.selling_price)}</p>
                      {item.is_found && <Badge variant="success" className="mt-0.5">Found</Badge>}
                      {item.is_unavailable && <Badge variant="error" className="mt-0.5">N/A</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Pricing</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Markup</span><span>{formatCurrency(order.markup_amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrency(order.delivery_fee)}</span></div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-success">-{formatCurrency(order.discount_amount)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
              </div>
            </div>

            {/* Assignments */}
            {order.assignments.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Assignments</h4>
                <div className="space-y-2">
                  {order.assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-button bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.assignee_name}</p>
                        <p className="text-xs text-slate-400">{a.role} - {a.assignee_phone}</p>
                      </div>
                      <Badge variant={a.status === 'completed' ? 'success' : a.status === 'failed' ? 'error' : 'primary'}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Info */}
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">Delivery</h4>
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
            {!['delivered', 'cancelled', 'failed'].includes(order.status) && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setReassignRole('runner'); setReassignOpen(true); }}
                  >
                    Reassign Runner
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
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
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation..."
                      className="w-full rounded-button border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={2}
                    />
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

            {/* Refund button for paid cancelled/failed orders */}
            {['cancelled', 'failed'].includes(order.status) && order.payment_status === 'paid' && (
              <div className="border-t border-slate-200 pt-4">
                <Button variant="secondary" size="sm" fullWidth isLoading={actionLoading} onClick={handleRefund}>
                  Process Refund
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
