'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/utils/format';
import {
  riderHistoryOutcome,
  riderTransitMinutes,
} from '@/lib/utils/rider-history';
import type { RiderHistoryDetail } from '@/lib/services/rider';

export default function RiderHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<RiderHistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/rider/history/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load delivery');
        setDelivery(data.delivery);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load delivery');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="py-16 text-center">
        <p className="text-error">{error || 'Delivery not found'}</p>
        <Link
          href="/rider/history"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to history
        </Link>
      </div>
    );
  }

  const outcome = riderHistoryOutcome(delivery);
  const transitMins = riderTransitMinutes(delivery);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/rider/history"
          className="rounded-button p-1 hover:bg-slate-100"
          aria-label="Back to history"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{delivery.order_number}</h1>
          <p className="text-sm text-slate-500">Delivery breakdown</p>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              outcome.variant === 'success'
                ? 'success'
                : outcome.variant === 'error'
                  ? 'error'
                  : outcome.variant === 'warning'
                    ? 'warning'
                    : 'default'
            }
          >
            {outcome.label}
          </Badge>
          {delivery.payment_method === 'cod' && (
            <Badge variant="warning">COD · {formatCurrency(delivery.total)}</Badge>
          )}
          {delivery.is_high_value && <Badge variant="error">High value</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailMetric label="Order total" value={formatCurrency(delivery.total)} />
          <DetailMetric label="Items" value={String(delivery.item_count)} />
          <DetailMetric
            label="Transit time"
            value={transitMins != null ? `${transitMins} min` : '—'}
          />
          <DetailMetric label="Attempts" value={String(delivery.attempt_count || 1)} />
        </div>
      </div>

      <Section title="Customer & drop-off">
        <InfoRow icon={User} label="Customer" value={delivery.customer_name} />
        <InfoRow
          icon={Phone}
          label="Phone"
          value={
            delivery.customer_phone
              ? formatPhone(delivery.customer_phone)
              : 'No phone on file'
          }
          href={
            delivery.customer_phone
              ? `tel:${delivery.customer_phone}`
              : undefined
          }
        />
        <InfoRow icon={MapPin} label="Address" value={delivery.delivery_address} />
        {delivery.delivery_notes && (
          <InfoRow icon={Package} label="Notes" value={delivery.delivery_notes} />
        )}
      </Section>

      <Section title="Parts">
        <p className="text-sm text-slate-700">{delivery.items_summary}</p>
      </Section>

      <Section title="Timeline">
        <TimelineStep
          label="Assigned"
          time={delivery.assigned_at}
          done={Boolean(delivery.assigned_at)}
        />
        <TimelineStep
          label="Pickup confirmed"
          time={delivery.pickup_confirmed_at}
          done={Boolean(delivery.pickup_confirmed_at)}
        />
        <TimelineStep
          label="Dispatched"
          time={delivery.dispatched_at}
          done={Boolean(delivery.dispatched_at)}
        />
        <TimelineStep
          label="Delivered"
          time={delivery.delivered_at}
          done={Boolean(delivery.delivered_at)}
          isLast
        />
      </Section>

      {delivery.delivery_attempts.length > 0 && (
        <Section title="Delivery attempts">
          <div className="space-y-2">
            {delivery.delivery_attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-button border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    Attempt #{attempt.attempt_number}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(attempt.attempted_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize text-slate-600">
                  {attempt.status.replace(/_/g, ' ')}
                </p>
                {attempt.failure_reason && (
                  <p className="mt-1 text-xs text-slate-500">{attempt.failure_reason}</p>
                )}
                {attempt.notes && (
                  <p className="mt-1 text-xs text-slate-500">{attempt.notes}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(delivery.rejection_reason || delivery.last_failure_reason) && (
        <Section title="Outcome notes">
          <p className="text-sm text-slate-600">
            {delivery.rejection_reason ?? delivery.last_failure_reason}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof User;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        {href ? (
          <a href={href} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-slate-700">{value}</p>
        )}
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  time,
  done,
  isLast = false,
}: {
  label: string;
  time: string | null;
  done: boolean;
  isLast?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isLast ? '' : 'pb-4'}`}>
      <div className="flex flex-col items-center">
        <div
          className={`h-3 w-3 rounded-full ${
            done ? 'bg-success' : 'border-2 border-slate-300 bg-white'
          }`}
        />
        {!isLast && (
          <div className={`mt-1 w-0.5 flex-1 ${done ? 'bg-success/30' : 'bg-slate-200'}`} />
        )}
      </div>
      <div className="min-w-0 flex-1 -mt-0.5">
        <p className={`text-sm font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
          {label}
        </p>
        {time && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {formatDateTime(time)}
          </p>
        )}
      </div>
    </div>
  );
}
