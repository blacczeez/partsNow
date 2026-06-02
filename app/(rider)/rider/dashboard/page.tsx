'use client';

import { Loader2, Bike } from 'lucide-react';
import { RiderDeliveryCard } from '@/components/rider/rider-delivery-card';
import { useRiderOrders } from '@/lib/hooks/use-rider-orders';

export default function RiderDashboardPage() {
  const { orders, isLoading, error } = useRiderOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Active Deliveries
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 py-12 text-center">
            <Bike className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No active deliveries
            </p>
            <p className="mt-1 text-xs text-slate-400">
              New delivery assignments will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((delivery) => (
              <RiderDeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
