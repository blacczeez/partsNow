'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import { toast } from '@/components/ui/toast';

interface DuplicateVendorEntry {
  id: string;
  name: string;
  contact_phone: string | null;
  location_in_market: string | null;
  verification_status: string;
  total_orders: number;
}

interface DuplicateVendorGroup {
  cluster_id: string;
  cluster_name: string;
  normalized_name: string;
  vendors: DuplicateVendorEntry[];
}

interface DuplicateVendorsPanelProps {
  onMerged?: () => void;
}

export function DuplicateVendorsPanel({ onMerged }: DuplicateVendorsPanelProps) {
  const [groups, setGroups] = useState<DuplicateVendorGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [mergingKey, setMergingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/vendors/duplicates')
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ groups?: DuplicateVendorGroup[] }>;
      })
      .then((data) => {
        if (!cancelled && data) {
          setGroups(data.groups ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const refreshDuplicates = () => {
    setIsLoading(true);
    setReloadNonce((n) => n + 1);
  };

  const handleMerge = async (group: DuplicateVendorGroup, keepId: string) => {
    const mergeTargets = group.vendors.filter((v) => v.id !== keepId);
    if (mergeTargets.length === 0) return;

    const mergeKey = `${group.cluster_id}:${group.normalized_name}`;
    setMergingKey(mergeKey);

    try {
      for (const target of mergeTargets) {
        const res = await fetch('/api/admin/vendors/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keepVendorId: keepId,
            mergeVendorId: target.id,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Merge failed');
        }
      }

      toast('success', `Merged ${mergeTargets.length} duplicate(s) into one vendor`);
      refreshDuplicates();
      onMerged?.();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Failed to merge vendors');
    } finally {
      setMergingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 animate-pulse rounded-card border border-slate-200 bg-white p-4">
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-amber-900">
          Possible duplicate vendors ({groups.length})
        </h2>
        <p className="mt-1 text-xs text-amber-800">
          Same stall name in one market — merge to keep order history and price data in one place.
        </p>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const mergeKey = `${group.cluster_id}:${group.normalized_name}`;
          const suggestedKeep =
            group.vendors.find(
              (v) => v.verification_status === VENDOR_VERIFICATION_STATUS.ACTIVE && v.contact_phone
            ) ?? group.vendors[0];

          return (
            <div
              key={mergeKey}
              className="rounded-button border border-amber-200 bg-white p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{group.normalized_name}</span>
                <Badge>{group.cluster_name}</Badge>
              </div>
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                {group.vendors.map((vendor) => (
                  <li key={vendor.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{vendor.name}</span>
                    {vendor.id === suggestedKeep.id && (
                      <Badge variant="primary">Suggested keep</Badge>
                    )}
                    {vendor.verification_status === VENDOR_VERIFICATION_STATUS.PENDING && (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {vendor.total_orders} orders
                      {vendor.contact_phone ? ` · ${vendor.contact_phone}` : ''}
                      {vendor.location_in_market ? ` · ${vendor.location_in_market}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="secondary"
                isLoading={mergingKey === mergeKey}
                onClick={() => handleMerge(group, suggestedKeep.id)}
              >
                Merge into {suggestedKeep.name}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
