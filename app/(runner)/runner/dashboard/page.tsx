'use client';

import { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { ShiftStatusCard } from '@/components/runner/shift-status-card';
import { ShiftSummaryModal } from '@/components/runner/shift-summary-modal';
import { RunnerOrderCard } from '@/components/runner/runner-order-card';
import { useRunnerShift } from '@/lib/hooks/use-runner-shift';
import { useRunnerOrders } from '@/lib/hooks/use-runner-orders';
import { toast } from '@/components/ui/toast';
import { countRunnerShiftBlockingOrders } from '@/lib/utils/runner-price-review';

export default function RunnerDashboardPage() {
  const { shift, float, isLoading: shiftLoading, startShift, endShift } = useRunnerShift();
  const { orders, isLoading: ordersLoading, refresh: refreshOrders } = useRunnerOrders(
    Boolean(shift)
  );
  const [isStarting, setIsStarting] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);

  const handleStartShift = () => {
    setIsStarting(true);

    if (!navigator.geolocation) {
      toast('error', 'Geolocation is not supported by your browser');
      setIsStarting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await startShift(pos.coords.latitude, pos.coords.longitude);
          await refreshOrders();
          toast('success', 'Shift started!');
        } catch (err) {
          toast('error', err instanceof Error ? err.message : 'Failed to start shift');
        } finally {
          setIsStarting(false);
        }
      },
      (err) => {
        let message = 'Failed to get location';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable location access.';
        }
        toast('error', message);
        setIsStarting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEndShift = async (notes?: string) => {
    try {
      const { transferSummary } = await endShift(notes);
      if (transferSummary?.transferred) {
        if (transferSummary.reassigned > 0) {
          toast(
            'success',
            `Shift ended. ${transferSummary.reassigned} waiting order${transferSummary.reassigned !== 1 ? 's' : ''} handed to another runner.`
          );
        } else if (transferSummary.orphaned > 0) {
          toast(
            'info',
            'Shift ended. Waiting orders will be assigned when the next runner clocks in.'
          );
        }
      } else {
        toast('success', 'Shift ended');
      }
      setShowEndShift(false);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to end shift');
      throw err;
    }
  };

  const blockingOrderCount = countRunnerShiftBlockingOrders(orders);
  const awaitingHandoffCount = orders.length - blockingOrderCount;

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <ShiftStatusCard
        shift={shift}
        float={float}
        activeOrderCount={blockingOrderCount}
        awaitingOrderCount={awaitingHandoffCount}
        isStarting={isStarting}
        onStartShift={handleStartShift}
        onEndShift={shift ? () => setShowEndShift(true) : undefined}
      />

      {shift ? (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Assigned Orders</h2>
            {orders.length > 0 && (
              <span className="text-sm text-slate-500">
                {orders.length} active
              </span>
            )}
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center rounded-card border border-slate-200 bg-white py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <Package className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No orders yet</p>
              <p className="mt-1 text-xs text-slate-400">
                New orders will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <RunnerOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <Package className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Start your shift to see orders
          </p>
        </div>
      )}

      {shift && (
        <ShiftSummaryModal
          isOpen={showEndShift}
          onClose={() => setShowEndShift(false)}
          shift={shift}
          float={float}
          onConfirmEnd={handleEndShift}
          footerHint={
            awaitingHandoffCount > 0
              ? `${awaitingHandoffCount} order${awaitingHandoffCount !== 1 ? 's' : ''} waiting on admin or customer will be handed to another runner (or queued until someone clocks in).`
              : undefined
          }
        />
      )}
    </div>
  );
}
