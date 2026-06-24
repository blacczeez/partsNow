'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/format';
import {
  formatPartIssueSubtype,
  formatVendorIncidentType,
} from '@/lib/constants/vendor-incidents';
import { toast } from '@/components/ui/toast';
import type { AdminVendorDetail } from '@/lib/services/admin-vendors';

interface VendorDetailSheetProps {
  vendorId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function VendorDetailSheet({
  vendorId,
  isOpen,
  onClose,
  onEdit,
}: VendorDetailSheetProps) {
  const [detail, setDetail] = useState<AdminVendorDetail | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const activeDetail =
    detail?.vendor.id === vendorId ? detail : null;
  const showLoading = Boolean(isOpen && vendorId && !activeDetail);

  useEffect(() => {
    if (!isOpen || !vendorId) return;

    let cancelled = false;

    fetch(`/api/admin/vendors/${vendorId}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<AdminVendorDetail>;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, vendorId]);

  const refresh = async () => {
    if (!vendorId) return;
    const res = await fetch(`/api/admin/vendors/${vendorId}`);
    if (res.ok) {
      setDetail(await res.json());
    }
  };

  const resolveIncident = async (incidentId: string, action: 'confirm' | 'reject') => {
    if (!vendorId) return;
    const note =
      action === 'confirm'
        ? window.prompt('Resolution note (optional):') ?? undefined
        : window.prompt('Rejection reason (optional):') ?? undefined;

    setActionLoading(incidentId);
    try {
      const res = await fetch(
        `/api/admin/vendors/${vendorId}/incidents/${incidentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, resolutionNote: note }),
        }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to resolve incident');
      }
      toast('success', action === 'confirm' ? 'Incident confirmed' : 'Incident rejected');
      await refresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={activeDetail?.vendor.name ?? 'Vendor reliability'}
    >
      {showLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded bg-slate-100" />
          <div className="h-32 rounded bg-slate-100" />
        </div>
      ) : activeDetail ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-3xl font-bold ${scoreColor(activeDetail.reliability.score)}`}>
                {activeDetail.reliability.score}%
              </p>
              <p className="text-sm text-slate-500">Reliability score</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>{activeDetail.reliability.totalOrders} orders sourced</p>
              <p>{activeDetail.reliability.qualityIssues} confirmed quality issues</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase text-slate-400">
              Score breakdown
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Base score</dt>
                <dd className="font-medium text-slate-900">
                  {activeDetail.reliability.components.baseScore}
                </dd>
              </div>
              <div className="flex justify-between text-red-700">
                <dt>Quality issues (−15 each)</dt>
                <dd>−{activeDetail.reliability.components.qualityPenalty}</dd>
              </div>
              <div className="flex justify-between text-red-700">
                <dt>Price over target (−5 each)</dt>
                <dd>−{activeDetail.reliability.components.priceDiscrepancyPenalty}</dd>
              </div>
              <div className="flex justify-between text-red-700">
                <dt>Out of stock (−3 each)</dt>
                <dd>−{activeDetail.reliability.components.outOfStockPenalty}</dd>
              </div>
              <div className="flex justify-between text-green-700">
                <dt>Positive orders (+2 each, max +10)</dt>
                <dd>+{activeDetail.reliability.components.positiveBonus}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <dt>Final score</dt>
                <dd className={scoreColor(activeDetail.reliability.score)}>
                  {activeDetail.reliability.score}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">
              Incident counts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Confirmed quality: {activeDetail.reliability.counts.confirmedQualityIssues}</p>
              <p>Pending quality: {activeDetail.reliability.counts.pendingQualityIssues}</p>
              <p>Price discrepancies: {activeDetail.reliability.counts.confirmedPriceDiscrepancies}</p>
              <p>Out of stock: {activeDetail.reliability.counts.confirmedOutOfStock}</p>
              <p>Rejected reports: {activeDetail.reliability.counts.rejectedIncidents}</p>
              <p>Positive order credits: {activeDetail.reliability.counts.positiveOrderCredits}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase text-slate-400">
              Recent incidents
            </h4>
            {activeDetail.incidents.length === 0 ? (
              <p className="text-sm text-slate-500">No incidents recorded.</p>
            ) : (
              <div className="space-y-3">
                {activeDetail.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border border-slate-100 bg-white p-3 text-sm"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {formatVendorIncidentType(incident.type)}
                      </span>
                      <Badge
                        variant={
                          incident.status === 'pending'
                            ? 'warning'
                            : incident.status === 'confirmed'
                              ? 'error'
                              : 'default'
                        }
                      >
                        {incident.status}
                      </Badge>
                    </div>
                    {incident.order_number && (
                      <p className="text-xs text-slate-600">Order: {incident.order_number}</p>
                    )}
                    {incident.item_description && (
                      <p className="text-xs text-slate-600">Item: {incident.item_description}</p>
                    )}
                    {incident.issue_subtype && (
                      <p className="text-xs text-slate-600">
                        {formatPartIssueSubtype(incident.issue_subtype)}
                      </p>
                    )}
                    {incident.description && (
                      <p className="mt-1 text-xs text-slate-500">{incident.description}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {incident.source ?? 'unknown'} · {formatRelativeTime(incident.created_at)}
                    </p>
                    {incident.status === 'pending' && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          isLoading={actionLoading === incident.id}
                          onClick={() => resolveIncident(incident.id, 'confirm')}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading === incident.id}
                          onClick={() => resolveIncident(incident.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {onEdit && (
            <Button variant="secondary" fullWidth onClick={onEdit}>
              Edit vendor details
            </Button>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
}
