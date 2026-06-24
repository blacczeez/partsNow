import type { SupabaseClient } from '@supabase/supabase-js';
import {
  NOTIFICATION_DESCRIPTIONS,
  NOTIFICATION_LABELS,
  NOTIFICATION_PREVIEW_LIMIT,
  NOTIFICATION_PRIORITY,
  type NotificationType,
} from '@/lib/constants/admin-notifications';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import { VENDOR_INCIDENT_STATUSES, formatPartIssueSubtype } from '@/lib/constants/vendor-incidents';
import { getAdminAttentionInbox } from '@/lib/services/admin-attention';

export interface AdminNotificationItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  createdAt?: string;
}

export interface AdminNotificationGroup {
  type: NotificationType;
  label: string;
  description: string;
  count: number;
  items: AdminNotificationItem[];
  viewAllHref: string;
  hasMore: boolean;
}

export interface AdminNotifications {
  totalCount: number;
  pendingVendors: number;
  groups: AdminNotificationGroup[];
}

interface PendingVendorIncidentRow {
  id: string;
  vendor_id: string | null;
  order_id: string | null;
  issue_subtype: string | null;
  source: string | null;
  created_at: string;
  vendors: { name: string } | { name: string }[] | null;
}

async function countPendingVendorIncidents(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('vendor_incidents')
    .select('id', { count: 'exact', head: true })
    .eq('status', VENDOR_INCIDENT_STATUSES.PENDING);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countPendingVendors(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', VENDOR_VERIFICATION_STATUS.PENDING);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function previewPendingVendorIncidents(
  supabase: SupabaseClient,
  limit: number
): Promise<AdminNotificationItem[]> {
  const { data, error } = await supabase
    .from('vendor_incidents')
    .select('id, vendor_id, order_id, issue_subtype, source, created_at, vendors(name)')
    .eq('status', VENDOR_INCIDENT_STATUSES.PENDING)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PendingVendorIncidentRow[];
  const orderIds = [
    ...new Set(
      rows
        .map((row) => row.order_id)
        .filter((id): id is string => id != null)
    ),
  ];

  let orderNumberMap: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', orderIds);

    if (ordersError) throw new Error(ordersError.message);

    orderNumberMap = Object.fromEntries(
      (orders ?? []).map((order: { id: string; order_number: string }) => [
        order.id,
        order.order_number,
      ])
    );
  }

  return rows.map((row) => {
    const vendor = row.vendors;
    const vendorName = Array.isArray(vendor) ? vendor[0]?.name : vendor?.name;
    const orderNumber = row.order_id ? orderNumberMap[row.order_id] : null;
    const issueLabel = formatPartIssueSubtype(row.issue_subtype);

    return {
      id: row.id,
      href: row.vendor_id
        ? `/admin/vendors?vendor=${row.vendor_id}`
        : orderNumber
          ? `/admin/orders?order=${row.order_id}`
          : '/admin/vendors',
      title: vendorName ? `${vendorName} — ${issueLabel}` : issueLabel,
      subtitle: [
        orderNumber ? `Order ${orderNumber}` : null,
        row.source ? `via ${row.source}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: row.created_at,
    };
  });
}

async function previewPendingVendors(
  supabase: SupabaseClient,
  limit: number
): Promise<AdminNotificationItem[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, created_at')
    .eq('verification_status', VENDOR_VERIFICATION_STATUS.PENDING)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((vendor: { id: string; name: string; created_at: string }) => ({
    id: vendor.id,
    href: `/admin/vendors?activate=${vendor.id}`,
    title: vendor.name,
    subtitle: 'Needs phone and activation',
    createdAt: vendor.created_at,
  }));
}

function attentionGroupToNotificationGroup(
  type: NotificationType,
  count: number,
  preview: Array<{ id: string; order_number: string }>
): AdminNotificationGroup {
  const viewAllHref =
    type === 'sourcing_escalated'
      ? '/admin/orders?attention=sourcing_escalated'
      : `/admin/orders?attention=${type}`;

  return {
    type,
    label: NOTIFICATION_LABELS[type],
    description: NOTIFICATION_DESCRIPTIONS[type],
    count,
    viewAllHref,
    hasMore: count > preview.length,
    items: preview.map((order) => ({
      id: order.id,
      href:
        type === 'sourcing_escalated'
          ? `/admin/orders?attention=sourcing_escalated&order=${order.id}`
          : `/admin/orders?order=${order.id}`,
      title: order.order_number,
      subtitle: NOTIFICATION_LABELS[type],
      createdAt: undefined,
    })),
  };
}

export async function getAdminNotifications(
  supabase: SupabaseClient,
  previewLimit = NOTIFICATION_PREVIEW_LIMIT
): Promise<AdminNotifications> {
  const [attention, incidentCount, pendingVendorCount, incidentPreview, vendorPreview] =
    await Promise.all([
      getAdminAttentionInbox(supabase, previewLimit),
      countPendingVendorIncidents(supabase),
      countPendingVendors(supabase),
      previewPendingVendorIncidents(supabase, previewLimit),
      previewPendingVendors(supabase, previewLimit),
    ]);

  const groups: AdminNotificationGroup[] = [];

  for (const group of attention.groups) {
    groups.push(
      attentionGroupToNotificationGroup(group.type, group.count, group.preview)
    );
  }

  if (incidentCount > 0) {
    groups.push({
      type: 'vendor_incident_pending',
      label: NOTIFICATION_LABELS.vendor_incident_pending,
      description: NOTIFICATION_DESCRIPTIONS.vendor_incident_pending,
      count: incidentCount,
      viewAllHref: '/admin/vendors',
      hasMore: incidentCount > incidentPreview.length,
      items: incidentPreview,
    });
  }

  if (pendingVendorCount > 0) {
    groups.push({
      type: 'vendor_pending_activation',
      label: NOTIFICATION_LABELS.vendor_pending_activation,
      description: NOTIFICATION_DESCRIPTIONS.vendor_pending_activation,
      count: pendingVendorCount,
      viewAllHref: '/admin/vendors?filter=pending',
      hasMore: pendingVendorCount > vendorPreview.length,
      items: vendorPreview,
    });
  }

  groups.sort(
    (a, b) => NOTIFICATION_PRIORITY[a.type] - NOTIFICATION_PRIORITY[b.type]
  );

  const totalCount =
    attention.totalCount + incidentCount + pendingVendorCount;

  return {
    totalCount,
    pendingVendors: pendingVendorCount,
    groups,
  };
}
