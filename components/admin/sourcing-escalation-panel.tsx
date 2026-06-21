'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { SourcingEscalationSummary } from '@/lib/utils/sourcing-escalation';

interface SourcingEscalationPanelProps {
  orderId: string;
  orderNumber: string;
  escalationReason: string | null;
  summary: SourcingEscalationSummary;
  actionLoading: boolean;
  onRetryAssign: () => Promise<boolean>;
  onMessageCustomer: (message: string) => Promise<boolean>;
  onDismiss: (note?: string) => Promise<boolean>;
  onReassignRunner: () => void;
  onCancel: () => void;
  onUpdated: () => void;
}

export function SourcingEscalationPanel({
  orderNumber,
  escalationReason,
  summary,
  actionLoading,
  onRetryAssign,
  onMessageCustomer,
  onDismiss,
  onReassignRunner,
  onCancel,
  onUpdated,
}: SourcingEscalationPanelProps) {
  const [customerMessage, setCustomerMessage] = useState('');
  const [dismissNote, setDismissNote] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showDismissForm, setShowDismissForm] = useState(false);

  if (!summary.isEscalated) return null;

  const handleRetry = async () => {
    const ok = await onRetryAssign();
    if (ok) {
      toast('success', 'Runner assignment retried');
      onUpdated();
    } else {
      toast('error', 'No runner available — try manual reassign');
    }
  };

  const handleMessage = async () => {
    if (!customerMessage.trim()) {
      toast('error', 'Enter a message for the customer');
      return;
    }
    const ok = await onMessageCustomer(customerMessage.trim());
    if (ok) {
      toast('success', 'Customer notified via WhatsApp');
      setCustomerMessage('');
      setShowMessageForm(false);
    } else {
      toast('error', 'Failed to send message');
    }
  };

  const handleDismiss = async () => {
    const ok = await onDismiss(dismissNote.trim() || undefined);
    if (ok) {
      toast('success', 'Escalation dismissed');
      setDismissNote('');
      setShowDismissForm(false);
      onUpdated();
    } else {
      toast('error', 'Failed to dismiss escalation');
    }
  };

  return (
    <div className="space-y-3 rounded-card border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-950">Sourcing escalation</p>
        {escalationReason && (
          <p className="mt-1 text-sm text-amber-900">{escalationReason}</p>
        )}
        <ul className="mt-2 space-y-0.5 text-xs text-amber-800">
          <li>
            {summary.unavailableRunnerCount} runner
            {summary.unavailableRunnerCount === 1 ? '' : 's'} marked unavailable
          </li>
          <li>
            {summary.unavailableItemCount} unavailable · {summary.pendingItemCount}{' '}
            still pending
          </li>
          <li>
            {summary.hasActiveRunner
              ? 'A runner is currently assigned'
              : 'No active runner on this order'}
          </li>
          {summary.allItemsUnavailable && (
            <li className="font-medium">All items unavailable — cancel recommended</li>
          )}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {!summary.allItemsUnavailable && !summary.hasActiveRunner && (
          <Button
            variant="primary"
            size="sm"
            isLoading={actionLoading}
            onClick={handleRetry}
          >
            Retry auto-assign
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={actionLoading}
          onClick={onReassignRunner}
        >
          Reassign runner
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={actionLoading}
          onClick={() => setShowMessageForm((v) => !v)}
        >
          Message customer
        </Button>
        {summary.allItemsUnavailable && (
          <Button variant="destructive" size="sm" disabled={actionLoading} onClick={onCancel}>
            Cancel order
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={actionLoading}
          onClick={() => setShowDismissForm((v) => !v)}
        >
          Dismiss
        </Button>
      </div>

      {showMessageForm && (
        <div className="space-y-2 border-t border-amber-200/60 pt-3">
          <label className="text-xs font-medium text-amber-900">
            WhatsApp message to customer ({orderNumber})
          </label>
          <textarea
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            placeholder="Explain sourcing delay or next steps..."
            className="w-full rounded-button border border-amber-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowMessageForm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoading}
              onClick={handleMessage}
            >
              Send via WhatsApp
            </Button>
          </div>
        </div>
      )}

      {showDismissForm && (
        <div className="space-y-2 border-t border-amber-200/60 pt-3">
          <label className="text-xs font-medium text-amber-900">
            Dismiss escalation (optional note)
          </label>
          <textarea
            value={dismissNote}
            onChange={(e) => setDismissNote(e.target.value)}
            placeholder="e.g. Runner reassigned manually, customer updated"
            className="w-full rounded-button border border-amber-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowDismissForm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoading}
              onClick={handleDismiss}
            >
              Dismiss escalation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
