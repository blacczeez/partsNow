'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PARTS_CUSTODY, canConfirmPartsAtHub } from '@/lib/constants/delivery-failure';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

interface SettlementBreakdown {
  partsSubtotal: number;
  recoverableParts: number;
  serviceFee: number;
  deliveryFee: number;
  returnHandlingFee: number;
  amountReturnedToCustomer: number;
  amountRetainedByPlatform: number;
  totalPaid: number;
  isFullRefund: boolean;
  fault: string;
}

interface DeliverySettlementPanelProps {
  orderId: string;
  settlementStatus: string | null;
  settlementFault: string | null;
  partsCustody: string | null;
  partsRecoveryRate: number | null;
  settlementRefundAmount: number | null;
  settlementCompletedAt: string | null;
  orderStatus: string;
  onUpdated: () => void;
}

export function DeliverySettlementPanel({
  orderId,
  settlementStatus,
  settlementFault,
  partsCustody,
  partsRecoveryRate,
  settlementRefundAmount,
  settlementCompletedAt,
  orderStatus,
  onUpdated,
}: DeliverySettlementPanelProps) {
  const defaultFault = settlementFault ?? 'customer';
  const defaultRecoveryPercent = Math.round((partsRecoveryRate ?? 0) * 100);
  const [faultOverride, setFaultOverride] = useState<string | null>(null);
  const [recoveryPercentOverride, setRecoveryPercentOverride] = useState<number | null>(
    null
  );
  const [prevSettlementFault, setPrevSettlementFault] = useState(settlementFault);
  const [prevPartsRecoveryRate, setPrevPartsRecoveryRate] = useState(partsRecoveryRate);
  const [breakdown, setBreakdown] = useState<SettlementBreakdown | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [draftSynced, setDraftSynced] = useState(false);
  const [confirmExecuteOpen, setConfirmExecuteOpen] = useState(false);

  if (settlementFault !== prevSettlementFault) {
    setPrevSettlementFault(settlementFault);
    setFaultOverride(null);
  }

  if (partsRecoveryRate !== prevPartsRecoveryRate) {
    setPrevPartsRecoveryRate(partsRecoveryRate);
    setRecoveryPercentOverride(null);
  }

  const fault = faultOverride ?? defaultFault;
  const recoveryPercent = recoveryPercentOverride ?? defaultRecoveryPercent;

  const showPanel =
    settlementStatus ||
    ['failed', 'rejected'].includes(orderStatus);

  const syncDraft = useCallback(async () => {
    setPreviewLoading(true);
    setDraftSynced(false);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          fault,
          partsRecoveryPercent: recoveryPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settlement preview');
      }
      setBreakdown(data.breakdown);
      setDraftSynced(true);
    } catch (err) {
      setDraftSynced(false);
      toast('error', err instanceof Error ? err.message : 'Failed to update preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [orderId, fault, recoveryPercent]);

  useEffect(() => {
    if (!showPanel || settlementStatus === 'completed') return;

    const timer = setTimeout(() => {
      syncDraft();
    }, 350);

    return () => clearTimeout(timer);
  }, [showPanel, settlementStatus, syncDraft]);

  if (!showPanel) return null;

  if (settlementStatus === 'completed') {
    return (
      <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">
          Delivery settlement
        </h4>
        <p className="text-sm text-slate-700">
          Completed {settlementCompletedAt ? new Date(settlementCompletedAt).toLocaleString() : ''}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">
          Refund to customer: {formatCurrency(settlementRefundAmount ?? 0)}
        </p>
      </div>
    );
  }

  const canExecute =
    draftSynced &&
    !previewLoading &&
    (fault === 'platform' || partsCustody === PARTS_CUSTODY.AT_HUB);

  async function handleExecute() {
    if (!draftSynced) {
      toast('error', 'Wait for settlement preview to finish updating');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Settlement failed');
      toast('success', 'Settlement executed');
      onUpdated();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePartsReturned() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/parts-returned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partsRecoveryPercent: recoveryPercent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast('success', 'Parts marked at hub');
      onUpdated();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase text-slate-400">
        Delivery settlement
      </h4>

      {settlementStatus === 'pending_parts' &&
        canConfirmPartsAtHub(partsCustody, orderStatus) && (
        <p className="mb-3 text-sm text-amber-800">
          {partsCustody === PARTS_CUSTODY.WITH_RIDER
            ? 'Parts are still with the rider. Confirm return to hub before settling.'
            : 'Parts custody was not recorded when delivery failed. Confirm the parts are back at the hub to continue.'}
        </p>
      )}

      {partsCustody === PARTS_CUSTODY.AT_HUB &&
        settlementStatus !== 'completed' && (
        <p className="mb-3 text-sm text-green-800">
          Parts confirmed at hub. Review recovery % and execute settlement.
        </p>
      )}

      <div className="mb-3 space-y-2">
        <label className="block text-xs font-medium text-slate-600">Fault</label>
        <Select
          fieldSize="sm"
          value={fault}
          onChange={(e) => setFaultOverride(e.target.value)}
          disabled={previewLoading || actionLoading}
        >
          <option value="customer">Customer fault</option>
          <option value="platform">Platform fault (full refund)</option>
          <option value="waived">Customer fault — waive Return & handling fee</option>
        </Select>
      </div>

      {fault !== 'platform' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Parts recovery from vendor (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={recoveryPercent}
            onChange={(e) =>
              setRecoveryPercentOverride(parseInt(e.target.value, 10) || 0)
            }
            disabled={previewLoading || actionLoading}
            className="w-full rounded-button border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      )}

      {previewLoading && (
        <p className="mb-3 text-xs text-slate-500">Updating settlement preview…</p>
      )}

      {breakdown && draftSynced && !previewLoading && (
        <div className="mb-3 space-y-1 rounded-button bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Recoverable parts</span>
            <span>{formatCurrency(breakdown.recoverableParts)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Return & handling fee</span>
            <span>−{formatCurrency(breakdown.returnHandlingFee)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-medium">
            <span>Refund to customer</span>
            <span>{formatCurrency(breakdown.amountReturnedToCustomer)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Service fee (kept)</span>
            <span>{formatCurrency(breakdown.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Delivery fee (kept)</span>
            <span>{formatCurrency(breakdown.deliveryFee)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {canConfirmPartsAtHub(partsCustody, orderStatus) && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            isLoading={actionLoading}
            disabled={previewLoading}
            onClick={handlePartsReturned}
          >
            Mark parts at hub & continue
          </Button>
        )}
        <Button
          size="sm"
          fullWidth
          isLoading={actionLoading}
          onClick={() => setConfirmExecuteOpen(true)}
          disabled={!canExecute}
        >
          Execute settlement
        </Button>
        {!canExecute && !previewLoading && partsCustody === PARTS_CUSTODY.AT_HUB && !draftSynced && (
          <p className="text-xs text-slate-500">
            Settlement preview is out of date — wait for it to refresh after your changes.
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmExecuteOpen}
        onClose={() => setConfirmExecuteOpen(false)}
        onConfirm={async () => {
          await handleExecute();
          setConfirmExecuteOpen(false);
        }}
        title="Execute settlement"
        description={
          breakdown ? (
            <>
              This will refund{' '}
              <strong>{formatCurrency(breakdown.amountReturnedToCustomer)}</strong> to the
              customer and finalize the failed delivery. This cannot be undone.
            </>
          ) : (
            'This will finalize the failed delivery settlement. This cannot be undone.'
          )
        }
        confirmLabel="Execute settlement"
        destructive
        isLoading={actionLoading}
      />
    </div>
  );
}
