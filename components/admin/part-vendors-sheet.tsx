'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';

interface PartVendorRow {
  id: string;
  vendor_id: string;
  vendor_name: string;
  contact_phone: string;
  location_in_market: string | null;
  cluster_name: string;
  last_price: number;
  average_price: number;
  price_count: number;
  last_seen_at: string;
}

interface PartVendorsSheetProps {
  partId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function PartVendorsContent({ partId }: { partId: string }) {
  const [partName, setPartName] = useState('');
  const [vendors, setVendors] = useState<PartVendorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/parts/${partId}/vendors`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load vendors');
        if (!cancelled) {
          setPartName(data.part?.name ?? '');
          setVendors(data.vendors ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load vendors');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [partId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-button bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-error">{error}</p>;
  }

  return (
    <>
      {partName && (
        <p className="mb-3 text-sm font-medium text-slate-900">{partName}</p>
      )}
      {vendors.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No vendors have sourced this part yet.
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="rounded-button border border-slate-200 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{vendor.vendor_name}</p>
                  <p className="text-xs text-slate-500">{vendor.cluster_name}</p>
                  {vendor.location_in_market && (
                    <p className="text-xs text-slate-500">{vendor.location_in_market}</p>
                  )}
                  <p className="text-xs text-slate-500">{vendor.contact_phone}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-900">
                    {formatCurrency(vendor.last_price)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Avg {formatCurrency(vendor.average_price)} · {vendor.price_count} quotes
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Last seen {formatRelativeTime(vendor.last_seen_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function PartVendorsSheet({ partId, isOpen, onClose }: PartVendorsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Part vendors">
      {isOpen && partId && <PartVendorsContent key={partId} partId={partId} />}
    </BottomSheet>
  );
}
