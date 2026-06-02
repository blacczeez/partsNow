'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Phone,
  MapPin,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { OrderItemCard } from '@/components/runner/order-item-card';
import { MarkFoundSheet } from '@/components/runner/mark-found-sheet';
import { MarkUnavailableSheet } from '@/components/runner/mark-unavailable-sheet';
import { ClarificationSheet } from '@/components/runner/clarification-sheet';
import { useRunnerOrderDetail } from '@/lib/hooks/use-runner-order-detail';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';

export default function RunnerOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    order,
    isLoading,
    error,
    acceptOrder,
    rejectOrder,
    markItemFound,
    markItemUnavailable,
    requestClarification,
    completeOrder,
  } = useRunnerOrderDetail(id);

  const [activeSheet, setActiveSheet] = useState<
    | { type: 'found'; itemId: string; itemDescription: string }
    | { type: 'unavailable'; itemId: string; itemDescription: string }
    | { type: 'clarify' }
    | null
  >(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-20 text-center">
        <p className="text-error">{error || 'Order not found'}</p>
        <Link href="/runner/dashboard" className="mt-4 text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isAssigned = order.assignment.status === 'assigned';
  const canAct = ['accepted', 'in_progress'].includes(order.assignment.status);
  const items = order.order_items || [];
  const unresolvedCount = items.filter((i) => !i.is_found && !i.is_unavailable).length;
  const allResolved = unresolvedCount === 0 && items.length > 0;

  // Check for price escalation warnings
  const hasEscalation = order.internal_notes?.includes('[PRICE ESCALATION]');

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptOrder();
      toast('success', 'Order accepted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast('error', 'Please enter a reason');
      return;
    }
    setIsRejecting(true);
    try {
      await rejectOrder(rejectReason.trim());
      toast('info', 'Order rejected');
      router.push('/runner/dashboard');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await completeOrder();
      toast('success', 'Order completed and handed to rider');
      router.push('/runner/dashboard');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleMarkFound = async (data: { vendorPrice: number; qcImageUrl: string }) => {
    if (activeSheet?.type !== 'found') return;
    await markItemFound(activeSheet.itemId, data);
    toast('success', 'Item marked as found');
  };

  const handleMarkUnavailable = async (reason: string) => {
    if (activeSheet?.type !== 'unavailable') return;
    await markItemUnavailable(activeSheet.itemId, reason);
    toast('info', 'Item marked as unavailable');
  };

  const handleClarify = async (message: string) => {
    await requestClarification(message);
    toast('success', 'Clarification sent');
  };

  // Clarification thread
  const clarificationThread = Array.isArray(order.clarification_thread)
    ? (order.clarification_thread as Array<{ from: string; message: string; timestamp: string }>)
    : [];

  return (
    <div className="pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/runner/dashboard"
          className="rounded-button p-1 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">{order.order_number}</h1>
          <p className="text-sm text-slate-500">{formatRelativeTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status as any} />
      </div>

      {/* Order Info */}
      <div className="mb-4 space-y-2 rounded-card border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="font-semibold text-slate-900">{formatCurrency(order.total)}</span>
        </div>
        <div className="flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{order.delivery_address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>
            {order.customer_name} &middot;{' '}
            <a href={`tel:${order.customer_phone}`} className="text-primary">
              {order.customer_phone}
            </a>
          </span>
        </div>
      </div>

      {/* Accept/Reject for new assignments */}
      {isAssigned && (
        <div className="mb-4 space-y-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            New order assigned to you
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleAccept}
              isLoading={isAccepting}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept
            </Button>
            {!showRejectInput ? (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowRejectInput(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            ) : (
              <div className="flex flex-1 flex-col gap-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection"
                  className="rounded-button border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  isLoading={isRejecting}
                >
                  Confirm Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price escalation warning */}
      {hasEscalation && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Price discrepancy flagged for admin review</span>
        </div>
      )}

      {/* Items */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Items ({items.length})
          </h2>
          {canAct && unresolvedCount > 0 && (
            <span className="text-sm text-slate-500">
              {unresolvedCount} remaining
            </span>
          )}
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <OrderItemCard
              key={item.id}
              item={item}
              canAct={canAct}
              onMarkFound={(itemId) =>
                setActiveSheet({
                  type: 'found',
                  itemId,
                  itemDescription: item.description,
                })
              }
              onMarkUnavailable={(itemId) =>
                setActiveSheet({
                  type: 'unavailable',
                  itemId,
                  itemDescription: item.description,
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Clarification Thread */}
      {clarificationThread.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Clarifications</h3>
          <div className="space-y-2">
            {clarificationThread.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-button p-3 text-sm ${
                  msg.from === 'runner'
                    ? 'ml-4 bg-primary/5 text-slate-700'
                    : 'mr-4 bg-slate-100 text-slate-700'
                }`}
              >
                <p className="mb-1 text-xs font-medium text-slate-500">
                  {msg.from === 'runner' ? 'You' : 'Customer'} &middot;{' '}
                  {formatRelativeTime(msg.timestamp)}
                </p>
                <p>{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarification button */}
      {canAct && (
        <Button
          variant="secondary"
          fullWidth
          className="mb-4"
          onClick={() => setActiveSheet({ type: 'clarify' })}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Ask Customer
        </Button>
      )}

      {/* Complete button */}
      {canAct && (
        <div className="fixed bottom-20 left-0 right-0 border-t border-slate-200 bg-white p-4 lg:bottom-0 lg:left-64">
          <Button
            fullWidth
            size="lg"
            onClick={handleComplete}
            isLoading={isCompleting}
            disabled={!allResolved}
          >
            <Package className="mr-2 h-5 w-5" />
            {allResolved
              ? 'Complete & Hand to Rider'
              : `${unresolvedCount} item${unresolvedCount !== 1 ? 's' : ''} remaining`}
          </Button>
        </div>
      )}

      {/* Sheets */}
      <MarkFoundSheet
        isOpen={activeSheet?.type === 'found'}
        onClose={() => setActiveSheet(null)}
        itemDescription={
          activeSheet?.type === 'found' ? activeSheet.itemDescription : ''
        }
        onSubmit={handleMarkFound}
      />

      <MarkUnavailableSheet
        isOpen={activeSheet?.type === 'unavailable'}
        onClose={() => setActiveSheet(null)}
        itemDescription={
          activeSheet?.type === 'unavailable' ? activeSheet.itemDescription : ''
        }
        onSubmit={handleMarkUnavailable}
      />

      <ClarificationSheet
        isOpen={activeSheet?.type === 'clarify'}
        onClose={() => setActiveSheet(null)}
        onSubmit={handleClarify}
      />
    </div>
  );
}
