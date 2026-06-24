import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import {
  VENDOR_INCIDENT_STATUSES,
  VENDOR_INCIDENT_TYPES,
  type PartIssueSubtype,
  type VendorIncidentSource,
  type VendorIncidentStatus,
  type VendorIncidentType,
} from '@/lib/constants/vendor-incidents';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

export const RELIABILITY_PENALTIES = {
  quality_issue: 15,
  price_discrepancy: 5,
  out_of_stock: 3,
  payment_issue: 5,
} as const;

export const RELIABILITY_POSITIVE_PER_ORDER = 2;
export const RELIABILITY_POSITIVE_CAP = 10;

export interface VendorIncidentCounts {
  confirmedQualityIssues: number;
  pendingQualityIssues: number;
  confirmedPriceDiscrepancies: number;
  confirmedOutOfStock: number;
  rejectedIncidents: number;
  positiveOrderCredits: number;
}

export interface VendorReliabilityBreakdown {
  score: number;
  totalOrders: number;
  qualityIssues: number;
  components: {
    baseScore: number;
    qualityPenalty: number;
    priceDiscrepancyPenalty: number;
    outOfStockPenalty: number;
    positiveBonus: number;
  };
  counts: VendorIncidentCounts;
}

export interface VendorIncidentRow {
  id: string;
  vendor_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  type: string;
  issue_subtype: string | null;
  status: string;
  source: string | null;
  description: string | null;
  resolution: string | null;
  photo_url: string | null;
  reported_by: string | null;
  created_at: string;
  order_number?: string | null;
  item_description?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export function computeReliabilityScoreFromCounts(
  counts: VendorIncidentCounts
): VendorReliabilityBreakdown['components'] & { score: number } {
  const qualityPenalty =
    counts.confirmedQualityIssues * RELIABILITY_PENALTIES.quality_issue;
  const priceDiscrepancyPenalty =
    counts.confirmedPriceDiscrepancies * RELIABILITY_PENALTIES.price_discrepancy;
  const outOfStockPenalty =
    counts.confirmedOutOfStock * RELIABILITY_PENALTIES.out_of_stock;
  const positiveBonus = Math.min(
    counts.positiveOrderCredits * RELIABILITY_POSITIVE_PER_ORDER,
    RELIABILITY_POSITIVE_CAP
  );

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 - qualityPenalty - priceDiscrepancyPenalty - outOfStockPenalty + positiveBonus
      )
    )
  );

  return {
    baseScore: 100,
    qualityPenalty,
    priceDiscrepancyPenalty,
    outOfStockPenalty,
    positiveBonus,
    score,
  };
}

export async function countPositiveOrderCredits(
  supabase: SupabaseClient,
  vendorId: string
): Promise<number> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, order_id')
    .eq('vendor_id', vendorId)
    .eq('is_found', true);

  if (error) throw new Error(error.message);
  if (!items?.length) return 0;

  const itemIds = items.map((row: { id: string }) => row.id);
  const orderIds = [...new Set(items.map((row: { order_id: string }) => row.order_id))];

  const [{ data: orders, error: ordersError }, { data: badItems, error: badError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select('id')
        .in('id', orderIds)
        .eq('status', 'delivered')
        .gte('rating', 4),
      supabase
        .from('vendor_incidents')
        .select('order_item_id')
        .in('order_item_id', itemIds)
        .eq('type', VENDOR_INCIDENT_TYPES.QUALITY_ISSUE)
        .eq('status', VENDOR_INCIDENT_STATUSES.CONFIRMED),
    ]);

  if (ordersError) throw new Error(ordersError.message);
  if (badError) throw new Error(badError.message);

  const goodOrderIds = new Set((orders ?? []).map((row: { id: string }) => row.id));
  const badItemIds = new Set(
    (badItems ?? []).map((row: { order_item_id: string }) => row.order_item_id)
  );

  const creditedOrders = new Set<string>();
  for (const item of items as Array<{ id: string; order_id: string }>) {
    if (!goodOrderIds.has(item.order_id) || badItemIds.has(item.id)) continue;
    creditedOrders.add(item.order_id);
  }

  return creditedOrders.size;
}

export async function gatherVendorIncidentCounts(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorIncidentCounts> {
  const { data: incidents, error } = await supabase
    .from('vendor_incidents')
    .select('type, status')
    .eq('vendor_id', vendorId);

  if (error) throw new Error(error.message);

  const rows = incidents ?? [];
  const confirmedQualityIssues = rows.filter(
    (r: { type: string; status: string }) =>
      r.type === VENDOR_INCIDENT_TYPES.QUALITY_ISSUE &&
      r.status === VENDOR_INCIDENT_STATUSES.CONFIRMED
  ).length;
  const pendingQualityIssues = rows.filter(
    (r: { type: string; status: string }) =>
      r.type === VENDOR_INCIDENT_TYPES.QUALITY_ISSUE &&
      r.status === VENDOR_INCIDENT_STATUSES.PENDING
  ).length;
  const confirmedPriceDiscrepancies = rows.filter(
    (r: { type: string; status: string }) =>
      r.type === VENDOR_INCIDENT_TYPES.PRICE_DISCREPANCY &&
      r.status === VENDOR_INCIDENT_STATUSES.CONFIRMED
  ).length;
  const confirmedOutOfStock = rows.filter(
    (r: { type: string; status: string }) =>
      r.type === VENDOR_INCIDENT_TYPES.OUT_OF_STOCK &&
      r.status === VENDOR_INCIDENT_STATUSES.CONFIRMED
  ).length;
  const rejectedIncidents = rows.filter(
    (r: { status: string }) => r.status === VENDOR_INCIDENT_STATUSES.REJECTED
  ).length;

  const positiveOrderCredits = await countPositiveOrderCredits(supabase, vendorId);

  return {
    confirmedQualityIssues,
    pendingQualityIssues,
    confirmedPriceDiscrepancies,
    confirmedOutOfStock,
    rejectedIncidents,
    positiveOrderCredits,
  };
}

export async function buildVendorReliabilityBreakdown(
  supabase: SupabaseClient,
  vendorId: string,
  totalOrders: number,
  qualityIssues: number
): Promise<VendorReliabilityBreakdown> {
  const counts = await gatherVendorIncidentCounts(supabase, vendorId);
  const computed = computeReliabilityScoreFromCounts(counts);

  return {
    score: computed.score,
    totalOrders,
    qualityIssues,
    components: {
      baseScore: computed.baseScore,
      qualityPenalty: computed.qualityPenalty,
      priceDiscrepancyPenalty: computed.priceDiscrepancyPenalty,
      outOfStockPenalty: computed.outOfStockPenalty,
      positiveBonus: computed.positiveBonus,
    },
    counts,
  };
}

export async function recalculateVendorReliability(vendorId: string): Promise<number> {
  const supabase = createServiceClient();

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('total_orders, quality_issues')
    .eq('id', vendorId)
    .single();

  if (vendorError || !vendor) throw new Error('Vendor not found');

  const counts = await gatherVendorIncidentCounts(supabase, vendorId);
  const { score } = computeReliabilityScoreFromCounts(counts);

  const { error: updateError } = await supabase
    .from('vendors')
    .update({
      reliability_score: score,
      quality_issues: counts.confirmedQualityIssues,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vendorId);

  if (updateError) throw new Error(updateError.message);

  if (
    config.vendor.autoDeactivateOnScoreDrop &&
    score < config.vendor.minReliabilityScore &&
    counts.confirmedQualityIssues >= config.vendor.qualityIssueLimitBeforeRemoval
  ) {
    await supabase
      .from('vendors')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', vendorId)
      .eq('is_active', true);
  }

  return score;
}

export async function recalculateVendorsForOrder(orderId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: items } = await supabase
    .from('order_items')
    .select('vendor_id')
    .eq('order_id', orderId)
    .not('vendor_id', 'is', null);

  const rows = (items ?? []) as Array<{ vendor_id: string | null }>;
  const vendorIds: string[] = [
    ...new Set(
      rows
        .map((row) => row.vendor_id)
        .filter((id): id is string => id != null)
    ),
  ];

  await Promise.all(vendorIds.map((vendorId) => recalculateVendorReliability(vendorId)));
}

interface CreateIncidentInput {
  vendorId?: string | null;
  orderId: string;
  orderItemId?: string | null;
  type: VendorIncidentType;
  issueSubtype?: PartIssueSubtype | null;
  status?: VendorIncidentStatus;
  source: VendorIncidentSource;
  reportedBy?: string | null;
  description: string;
  photoUrl?: string | null;
}

export async function createVendorIncident(
  input: CreateIncidentInput
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('vendor_incidents')
    .insert({
      vendor_id: input.vendorId ?? null,
      order_id: input.orderId,
      order_item_id: input.orderItemId ?? null,
      type: input.type,
      issue_subtype: input.issueSubtype ?? null,
      status: input.status ?? VENDOR_INCIDENT_STATUSES.PENDING,
      source: input.source,
      reported_by: input.reportedBy ?? null,
      description: input.description,
      photo_url: input.photoUrl ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  if (input.vendorId && input.status === VENDOR_INCIDENT_STATUSES.CONFIRMED) {
    await recalculateVendorReliability(input.vendorId);
  }

  return data.id as string;
}

export async function resolveVendorIncident(
  incidentId: string,
  action: 'confirm' | 'reject',
  adminId: string,
  resolutionNote?: string
): Promise<void> {
  const supabase = createServiceClient();

  const { data: incident, error } = await supabase
    .from('vendor_incidents')
    .select('id, vendor_id, order_id, type, status, description')
    .eq('id', incidentId)
    .single();

  if (error || !incident) throw new Error('Incident not found');
  if (incident.status !== VENDOR_INCIDENT_STATUSES.PENDING) {
    throw new Error('Incident is already resolved');
  }

  const resolution =
    action === 'confirm'
      ? resolutionNote?.trim() || `Confirmed by admin ${adminId}`
      : resolutionNote?.trim() || `Rejected by admin ${adminId}`;

  const { error: updateError } = await supabase
    .from('vendor_incidents')
    .update({
      status:
        action === 'confirm'
          ? VENDOR_INCIDENT_STATUSES.CONFIRMED
          : VENDOR_INCIDENT_STATUSES.REJECTED,
      resolution,
    })
    .eq('id', incidentId);

  if (updateError) throw new Error(updateError.message);

  if (incident.vendor_id) {
    await recalculateVendorReliability(incident.vendor_id);
  }

  await writeAuditLog({
    userId: adminId,
    action:
      action === 'confirm'
        ? AUDIT_ACTIONS.VENDOR_INCIDENT_CONFIRMED
        : AUDIT_ACTIONS.VENDOR_INCIDENT_REJECTED,
    entityType: 'vendor_incident',
    entityId: incidentId,
    newValues: auditDetails(`Vendor incident ${action}ed`, {
      vendorId: incident.vendor_id,
      orderId: incident.order_id,
      type: incident.type,
      resolution,
    }),
  });
}

export async function listVendorIncidents(
  supabase: SupabaseClient,
  vendorId: string,
  limit = 50
): Promise<VendorIncidentRow[]> {
  const { data, error } = await supabase
    .from('vendor_incidents')
    .select(
      'id, vendor_id, order_id, order_item_id, type, issue_subtype, status, source, description, resolution, photo_url, reported_by, created_at, orders(order_number), order_items(description)'
    )
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const order = row.orders as { order_number?: string } | { order_number?: string }[] | null;
    const item = row.order_items as { description?: string } | { description?: string }[] | null;
    const orderNumber = Array.isArray(order) ? order[0]?.order_number : order?.order_number;
    const itemDescription = Array.isArray(item) ? item[0]?.description : item?.description;

    return {
      id: row.id as string,
      vendor_id: row.vendor_id as string | null,
      order_id: row.order_id as string | null,
      order_item_id: row.order_item_id as string | null,
      type: row.type as string,
      issue_subtype: row.issue_subtype as string | null,
      status: row.status as string,
      source: row.source as string | null,
      description: row.description as string | null,
      resolution: row.resolution as string | null,
      photo_url: row.photo_url as string | null,
      reported_by: row.reported_by as string | null,
      created_at: row.created_at as string,
      order_number: orderNumber ?? null,
      item_description: itemDescription ?? null,
    };
  });
}
