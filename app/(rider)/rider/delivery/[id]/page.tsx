'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Banknote,
  Package,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeliveryStatusBar } from '@/components/rider/delivery-status-bar';
import { PickupConfirmationSheet } from '@/components/rider/pickup-confirmation-sheet';
import { DeliveryConfirmationSheet } from '@/components/rider/delivery-confirmation-sheet';
import { DeliveryFailureSheet } from '@/components/rider/delivery-failure-sheet';
import { useRiderDeliveryDetail } from '@/lib/hooks/use-rider-delivery-detail';
import { useLocationTracking } from '@/lib/hooks/use-location-tracking';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    delivery,
    isLoading,
    error,
    confirmPickup,
    confirmDelivery,
  } = useRiderDeliveryDetail(id);

  const isInProgress = delivery?.assignment.status === 'in_progress';
  const { isTracking, startTracking, stopTracking } = useLocationTracking(
    isInProgress ? id : null
  );

  const [activeSheet, setActiveSheet] = useState<
    'pickup' | 'deliver' | 'failure' | null
  >(null);

  // Auto-start location tracking when delivery is in_progress
  useEffect(() => {
    if (isInProgress && !isTracking) {
      startTracking();
    }
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isInProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="py-20 text-center">
        <p className="text-error">{error || 'Delivery not found'}</p>
        <Link
          href="/rider/dashboard"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isAssigned = delivery.assignment.status === 'assigned';
  const isCod = delivery.payment_method === 'cod';
  const items = delivery.order_items || [];
  const itemsSummary = items
    .map((item) => `${item.quantity}x ${item.description}`)
    .join(', ');

  const handleConfirmPickup = async (pickupPhotoUrl?: string) => {
    try {
      await confirmPickup(pickupPhotoUrl);
      toast('success', 'Pickup confirmed! Tracking started.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to confirm pickup');
      throw err;
    }
  };

  const handleConfirmDelivery = async (data: {
    photoUrl?: string;
    codAmountCollected?: number;
  }) => {
    try {
      await confirmDelivery(data);
      toast('success', 'Delivery completed!');
      router.push('/rider/dashboard');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to confirm delivery');
      throw err;
    }
  };

  const handleReportFailure = async (data: {
    reason: string;
    notes?: string;
    photoUrl?: string;
    latitude?: number;
    longitude?: number;
    callAttemptsMade?: number;
  }) => {
    try {
      const res = await fetch(`/api/rider/orders/${id}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to report issue');

      if (body.outcome === 'retry') {
        toast('info', 'Attempt logged — wait before trying again');
        setActiveSheet(null);
        return;
      }
      if (body.outcome === 'admin_review') {
        toast('info', 'Escalated to ops — return parts to hub if needed');
      } else {
        toast('info', 'Issue reported');
      }
      router.push('/rider/dashboard');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to report issue');
      throw err;
    }
  };

  return (
    <div className="pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/rider/dashboard"
          className="rounded-button p-1 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">
            {delivery.order_number}
          </h1>
          <p className="text-sm text-slate-500">
            {formatRelativeTime(delivery.created_at)}
          </p>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      {/* Status Bar */}
      <div className="mb-4">
        <DeliveryStatusBar
          assignmentStatus={delivery.assignment.status}
          isTracking={isTracking}
          etaMinutes={delivery.tracking?.eta_minutes}
        />
      </div>

      {/* COD Banner */}
      {isCod && delivery.payment_status !== 'paid' && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-orange-200 bg-orange-50 px-4 py-3">
          <Banknote className="h-5 w-5 flex-shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              Cash on Delivery: {formatCurrency(delivery.total)}
            </p>
            <p className="text-xs text-orange-600">
              Collect payment from customer before handing over parts
            </p>
          </div>
        </div>
      )}

      {/* Order Info */}
      <div className="mb-4 space-y-2 rounded-card border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="font-semibold text-slate-900">
            {formatCurrency(delivery.total)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Items</span>
          <span className="text-sm text-slate-700">{items.length}</span>
        </div>
        {delivery.total_weight_kg != null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Package weight</span>
            <span className="text-sm font-medium text-slate-900">
              {delivery.total_weight_kg} kg
              {delivery.delivery_vehicle_type
                ? ` · ${delivery.delivery_vehicle_type}`
                : ''}
            </span>
          </div>
        )}
        <p className="text-sm text-slate-600">{itemsSummary}</p>
      </div>

      {/* Customer & Delivery */}
      <div className="mb-4 space-y-2 rounded-card border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>
            {delivery.customer_name} &middot;{' '}
            <a href={`tel:${delivery.customer_phone}`} className="text-primary">
              {delivery.customer_phone}
            </a>
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{delivery.delivery_address}</span>
        </div>
        {delivery.delivery_notes && (
          <div className="flex items-start gap-1.5 text-sm text-slate-500">
            <Package className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{delivery.delivery_notes}</span>
          </div>
        )}
      </div>

      {/* High-value warning */}
      {delivery.is_high_value && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>High-value order — handle with extra care</span>
        </div>
      )}

      {/* Previous delivery attempts */}
      {delivery.delivery_attempts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Previous Attempts
          </h3>
          <div className="space-y-2">
            {delivery.delivery_attempts.map((attempt) => (
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
                {attempt.failure_reason && (
                  <p className="mt-1 text-xs text-slate-500">
                    Reason: {attempt.failure_reason.replace(/_/g, ' ')}
                  </p>
                )}
                {attempt.notes && (
                  <p className="mt-1 text-xs text-slate-500">{attempt.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-slate-200 bg-white p-4 lg:bottom-0 lg:left-0">
        {isAssigned && (
          <Button
            fullWidth
            size="lg"
            onClick={() => setActiveSheet('pickup')}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Confirm Pickup
          </Button>
        )}

        {isInProgress && (
          <div className="flex gap-3">
            <Button
              fullWidth
              size="lg"
              onClick={() => setActiveSheet('deliver')}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Complete Delivery
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setActiveSheet('failure')}
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Sheets */}
      <PickupConfirmationSheet
        isOpen={activeSheet === 'pickup'}
        onClose={() => setActiveSheet(null)}
        isHighValue={delivery.is_high_value}
        onSubmit={handleConfirmPickup}
      />

      <DeliveryConfirmationSheet
        isOpen={activeSheet === 'deliver'}
        onClose={() => setActiveSheet(null)}
        isCod={isCod && delivery.payment_status !== 'paid'}
        orderTotal={delivery.total}
        onSubmit={handleConfirmDelivery}
      />

      <DeliveryFailureSheet
        isOpen={activeSheet === 'failure'}
        onClose={() => setActiveSheet(null)}
        isHighValue={delivery.is_high_value}
        deliveryRetryAfter={delivery.delivery_retry_after}
        onSubmit={handleReportFailure}
      />
    </div>
  );
}
