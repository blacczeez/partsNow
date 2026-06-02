'use client';

import { Loader2, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiderHistoryCard } from '@/components/rider/rider-history-card';
import { useRiderHistory } from '@/lib/hooks/use-rider-history';

export default function RiderHistoryPage() {
  const { deliveries, isLoading, error, hasMore, loadMore } = useRiderHistory();

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && deliveries.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Delivery History</h1>

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 py-12 text-center">
          <Bike className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No deliveries yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Completed deliveries will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <RiderHistoryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>

          {hasMore && (
            <Button
              variant="secondary"
              fullWidth
              onClick={loadMore}
              isLoading={isLoading}
            >
              Load More
            </Button>
          )}
        </>
      )}
    </div>
  );
}
