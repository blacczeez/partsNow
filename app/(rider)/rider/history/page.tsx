'use client';

import { Loader2, Bike, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiderHistoryCard } from '@/components/rider/rider-history-card';
import { useRiderHistory } from '@/lib/hooks/use-rider-history';
import { groupRiderHistoryByDate } from '@/lib/utils/rider-history';

export default function RiderHistoryPage() {
  const { deliveries, stats, isLoading, error, hasMore, loadMore } = useRiderHistory();
  const groups = groupRiderHistoryByDate(deliveries);

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
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Delivery History</h1>
        <p className="text-sm text-slate-500">
          Past deliveries, outcomes, and timing breakdown
        </p>
      </div>

      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={String(stats.total)} icon={Bike} tone="text-slate-900" />
          <StatCard label="Delivered" value={String(stats.delivered)} icon={CheckCircle} tone="text-success" />
          <StatCard label="Declined / transferred" value={String(stats.declined)} icon={AlertTriangle} tone="text-warning" />
          <StatCard label="Failed" value={String(stats.failed)} icon={XCircle} tone="text-error" />
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 py-12 text-center">
          <Bike className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No deliveries yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Completed and declined deliveries will appear here
          </p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.label} className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500">{group.label}</h2>
              <div className="space-y-3">
                {group.items.map((delivery) => (
                  <RiderHistoryCard
                    key={`${delivery.id}-${delivery.assignment_id}`}
                    delivery={delivery}
                  />
                ))}
              </div>
            </section>
          ))}

          {hasMore && (
            <Button variant="secondary" fullWidth onClick={loadMore} isLoading={isLoading}>
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Bike;
  tone: string;
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
