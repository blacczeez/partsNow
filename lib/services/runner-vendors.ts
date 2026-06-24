import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { normalizeVendorName, vendorNamesLikelyMatch } from '@/lib/utils/vendor-name-match';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';

export interface VendorSuggestion {
  id: string;
  name: string;
  location_in_market: string | null;
  source: 'history' | 'listed';
  last_price: number | null;
  price_count: number | null;
  reliability_score: number;
  verification_status: string;
}

export interface QuickAddVendorInput {
  name: string;
  locationInMarket?: string;
}

async function assertRunnerCanSourceOrder(
  runnerId: string,
  orderId: string
): Promise<{ clusterId: string }> {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id')
    .eq('order_id', orderId)
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress'])
    .maybeSingle();

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  const { data: order, error } = await supabase
    .from('orders')
    .select('cluster_id')
    .eq('id', orderId)
    .single();

  if (error || !order?.cluster_id) throw new Error('Order cluster not found');

  return { clusterId: order.cluster_id };
}

export async function getVendorSuggestionsForItem(
  runnerId: string,
  orderId: string,
  itemId: string
): Promise<{ suggestions: VendorSuggestion[]; hasCatalogPart: boolean }> {
  const { clusterId } = await assertRunnerCanSourceOrder(runnerId, orderId);
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select('part_id')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (itemError || !item) throw new Error('Item not found');

  const suggestions: VendorSuggestion[] = [];
  const seen = new Set<string>();

  if (item.part_id) {
    const { data: historyRows } = await supabase
      .from('vendor_parts')
      .select(
        'last_price, price_count, vendors(id, name, location_in_market, reliability_score, verification_status, cluster_id, is_active)'
      )
      .eq('part_id', item.part_id)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    for (const row of historyRows ?? []) {
      const rawVendor = row.vendors as unknown;
      const vendor = (Array.isArray(rawVendor) ? rawVendor[0] : rawVendor) as {
        id: string;
        name: string;
        location_in_market: string | null;
        reliability_score: number;
        verification_status: string;
        cluster_id: string;
        is_active: boolean;
      } | null;

      if (!vendor || vendor.cluster_id !== clusterId || !vendor.is_active) continue;
      if (seen.has(vendor.id)) continue;
      seen.add(vendor.id);

      suggestions.push({
        id: vendor.id,
        name: vendor.name,
        location_in_market: vendor.location_in_market,
        source: 'history',
        last_price: Number(row.last_price),
        price_count: row.price_count,
        reliability_score: vendor.reliability_score,
        verification_status: vendor.verification_status ?? VENDOR_VERIFICATION_STATUS.ACTIVE,
      });
    }
  }

  const { data: clusterVendors } = await supabase
    .from('vendors')
    .select('id, name, location_in_market, reliability_score, verification_status')
    .eq('cluster_id', clusterId)
    .eq('is_active', true)
    .order('reliability_score', { ascending: false })
    .limit(30);

  for (const vendor of clusterVendors ?? []) {
    if (seen.has(vendor.id)) continue;
    seen.add(vendor.id);
    suggestions.push({
      id: vendor.id,
      name: vendor.name,
      location_in_market: vendor.location_in_market,
      source: 'listed',
      last_price: null,
      price_count: null,
      reliability_score: vendor.reliability_score,
      verification_status: vendor.verification_status ?? VENDOR_VERIFICATION_STATUS.ACTIVE,
    });
  }

  return {
    suggestions,
    hasCatalogPart: Boolean(item.part_id),
  };
}

async function findExistingVendorInCluster(
  clusterId: string,
  name: string,
  locationInMarket?: string
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, location_in_market')
    .eq('cluster_id', clusterId)
    .eq('is_active', true);

  for (const vendor of vendors ?? []) {
    if (!vendorNamesLikelyMatch(vendor.name, name)) continue;
    if (locationInMarket?.trim() && vendor.location_in_market?.trim()) {
      if (normalizeVendorName(vendor.location_in_market) !== normalizeVendorName(locationInMarket)) {
        continue;
      }
    }
    return vendor.id;
  }

  return null;
}

export async function resolveVendorForSourcing(params: {
  runnerId: string;
  clusterId: string;
  vendorId?: string;
  quickAddVendor?: QuickAddVendorInput;
}): Promise<string> {
  const { runnerId, clusterId, vendorId, quickAddVendor } = params;
  const supabase = createServiceClient();

  if (vendorId) {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('id, cluster_id, is_active')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) throw new Error('Vendor not found');
    if (vendor.cluster_id !== clusterId) {
      throw new Error('Vendor is not in this order market');
    }
    if (!vendor.is_active) throw new Error('Vendor is not active');
    return vendor.id;
  }

  if (!quickAddVendor?.name?.trim()) {
    throw new Error('Select a vendor or add a new stall name');
  }

  const name = quickAddVendor.name.trim();
  const location = quickAddVendor.locationInMarket?.trim() || null;

  const existingId = await findExistingVendorInCluster(clusterId, name, location ?? undefined);
  if (existingId) return existingId;

  const { data: created, error: createError } = await supabase
    .from('vendors')
    .insert({
      cluster_id: clusterId,
      name,
      location_in_market: location,
      contact_phone: null,
      verification_status: VENDOR_VERIFICATION_STATUS.PENDING,
      created_by_runner_id: runnerId,
      is_active: true,
    })
    .select('id')
    .single();

  throwIfSupabaseError(createError, 'Failed to add vendor');

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.VENDOR_QUICK_ADDED_BY_RUNNER,
    entityType: 'vendor',
    entityId: created!.id,
    newValues: auditDetails('Runner quick-added vendor at sourcing', {
      name,
      locationInMarket: location,
      clusterId,
    }),
  });

  return created!.id;
}

export async function incrementVendorOrderCount(vendorId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: vendor } = await supabase
    .from('vendors')
    .select('total_orders')
    .eq('id', vendorId)
    .single();

  if (!vendor) return;

  await supabase
    .from('vendors')
    .update({
      total_orders: (vendor.total_orders ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vendorId);
}
