'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils/format';
import {
  formatPartIssueSubtype,
  formatVendorIncidentType,
} from '@/lib/constants/vendor-incidents';

export interface OrderVendorIncident {
  id: string;
  vendor_id: string | null;
  order_item_id: string | null;
  type: string;
  issue_subtype: string | null;
  status: string;
  source: string | null;
  description: string | null;
  resolution: string | null;
  photo_url: string | null;
  created_at: string;
  vendor_name?: string | null;
  item_description?: string | null;
}

interface VendorIncidentsPanelProps {
  incidents: OrderVendorIncident[];
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'confirmed') return 'error';
  if (status === 'pending') return 'warning';
  if (status === 'rejected') return 'default';
  return 'default';
}

export function VendorIncidentsPanel({ incidents }: VendorIncidentsPanelProps) {
  if (!incidents.length) return null;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase text-slate-400">
        Vendor incidents ({incidents.length})
      </h4>
      <div className="space-y-3">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">
                {formatVendorIncidentType(incident.type)}
              </span>
              <Badge variant={statusVariant(incident.status)}>{incident.status}</Badge>
              {incident.source && (
                <span className="text-xs text-slate-500">via {incident.source}</span>
              )}
            </div>
            {incident.vendor_name && (
              <p className="text-xs text-slate-600">Vendor: {incident.vendor_name}</p>
            )}
            {incident.item_description && (
              <p className="text-xs text-slate-600">Item: {incident.item_description}</p>
            )}
            {incident.issue_subtype && (
              <p className="text-xs text-slate-600">
                Issue: {formatPartIssueSubtype(incident.issue_subtype)}
              </p>
            )}
            {incident.description && (
              <p className="mt-1 text-xs text-slate-500">{incident.description}</p>
            )}
            {incident.resolution && (
              <p className="mt-1 text-xs text-slate-500">Resolution: {incident.resolution}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {formatRelativeTime(incident.created_at)}
            </p>
            {incident.photo_url && (
              <a
                href={incident.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary underline"
              >
                View photo evidence
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
