'use client';

import { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { ShiftStatusCard } from '@/components/runner/shift-status-card';
import { RunnerOrderCard } from '@/components/runner/runner-order-card';
import { useRunnerShift } from '@/lib/hooks/use-runner-shift';
import { useRunnerOrders } from '@/lib/hooks/use-runner-orders';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { toast } from '@/components/ui/toast';

export default function RunnerDashboardPage() {
  const { shift, float, isLoading: shiftLoading, startShift } = useRunnerShift();
  const { orders, isLoading: ordersLoading } = useRunnerOrders();
  const { requestPosition } = useGeolocation();
  const [isStarting, setIsStarting] = useState(false);

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

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShiftStatusCard
        shift={shift}
        float={float}
        activeOrderCount={orders.length}
        isStarting={isStarting}
        onStartShift={handleStartShift}
      />

      {shift ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Assigned Orders
          </h2>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 py-12 text-center">
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
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 py-12 text-center">
          <Package className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Start your shift to see orders
          </p>
        </div>
      )}
    </div>
  );
}
