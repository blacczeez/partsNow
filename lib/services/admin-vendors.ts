import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { VENDOR_VERIFICATION_STATUS } from '@/lib/constants/vendors';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { normalizeVendorName } from '@/lib/utils/vendor-name-match';
import { combineVendorPartRows } from '@/lib/utils/vendor-merge';
import {
  buildVendorReliabilityBreakdown,
  listVendorIncidents,
  type VendorReliabilityBreakdown,
  type VendorIncidentRow,
} from '@/lib/services/vendor-reliability';
import type { Vendor } from '@/lib/types/database';

export interface DuplicateVendorEntry {
  id: string;
  name: string;
  contact_phone: string | null;
  location_in_market: string | null;
  verification_status: string;
  total_orders: number;
  is_active: boolean;
}

export interface DuplicateVendorGroup {
  cluster_id: string;
  cluster_name: string;
  normalized_name: string;
  vendors: DuplicateVendorEntry[];
}

export async function getDuplicateVendorGroups(): Promise<DuplicateVendorGroup[]> {
  const supabase = await createClient();

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select(
      'id, name, contact_phone, location_in_market, cluster_id, verification_status, total_orders, is_active'
    )
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  if (!vendors?.length) return [];

  const clusterIds = [...new Set(vendors.map((v) => v.cluster_id))];
  const { data: clusters } = await supabase
    .from('clusters')
    .select('id, name')
    .in('id', clusterIds);

  const clusterMap: Record<string, string> = {};
  clusters?.forEach((c) => {
    clusterMap[c.id] = c.name;
  });

  const groups = new Map<string, DuplicateVendorEntry[]>();

  for (const vendor of vendors) {
    const key = `${vendor.cluster_id}:${normalizeVendorName(vendor.name)}`;
    const entry: DuplicateVendorEntry = {
      id: vendor.id,
      name: vendor.name,
      contact_phone: vendor.contact_phone,
      location_in_market: vendor.location_in_market,
      verification_status: vendor.verification_status,
      total_orders: vendor.total_orders,
      is_active: vendor.is_active,
    };
    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }

  const duplicates: DuplicateVendorGroup[] = [];

  for (const [key, entries] of groups) {
    if (entries.length < 2) continue;
    const [clusterId, normalized_name] = key.split(':');
    duplicates.push({
      cluster_id: clusterId,
      cluster_name: clusterMap[clusterId] ?? 'Unknown',
      normalized_name,
      vendors: entries.sort((a, b) => b.total_orders - a.total_orders),
    });
  }

  return duplicates.sort((a, b) => a.cluster_name.localeCompare(b.cluster_name));
}

export async function mergeVendors(
  keepVendorId: string,
  mergeVendorId: string,
  adminId: string
) {
  if (keepVendorId === mergeVendorId) {
    throw new Error('Cannot merge a vendor with itself');
  }

  const supabase = await createClient();

  const { data: rows, error: fetchError } = await supabase
    .from('vendors')
    .select('*')
    .in('id', [keepVendorId, mergeVendorId]);

  if (fetchError) throw new Error(fetchError.message);

  const keep = rows?.find((v) => v.id === keepVendorId);
  const merge = rows?.find((v) => v.id === mergeVendorId);

  if (!keep || !merge) throw new Error('One or both vendors not found');
  if (keep.cluster_id !== merge.cluster_id) {
    throw new Error('Vendors must be in the same market cluster');
  }
  if (!keep.is_active || !merge.is_active) {
    throw new Error('Both vendors must be active to merge');
  }
  if (normalizeVendorName(keep.name) !== normalizeVendorName(merge.name)) {
    throw new Error('Vendor names do not look like duplicates');
  }

  const { data: mergeParts, error: mergePartsError } = await supabase
    .from('vendor_parts')
    .select('id, part_id, last_price, price_count, average_price, last_seen_at')
    .eq('vendor_id', mergeVendorId);

  if (mergePartsError) throw new Error(mergePartsError.message);

  const affectedPartIds = new Set<string>();

  for (const mergeRow of mergeParts ?? []) {
    affectedPartIds.add(mergeRow.part_id);

    const { data: keepRow } = await supabase
      .from('vendor_parts')
      .select('id, last_price, price_count, average_price, last_seen_at')
      .eq('vendor_id', keepVendorId)
      .eq('part_id', mergeRow.part_id)
      .maybeSingle();

    if (keepRow) {
      const combined = combineVendorPartRows(keepRow, mergeRow);
      const { error: updateError } = await supabase
        .from('vendor_parts')
        .update({
          ...combined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keepRow.id);

      if (updateError) throw new Error(updateError.message);

      const { error: deleteError } = await supabase
        .from('vendor_parts')
        .delete()
        .eq('id', mergeRow.id);

      if (deleteError) throw new Error(deleteError.message);
    } else {
      const { error: reassignError } = await supabase
        .from('vendor_parts')
        .update({
          vendor_id: keepVendorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mergeRow.id);

      if (reassignError) throw new Error(reassignError.message);
    }
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .update({ vendor_id: keepVendorId })
    .eq('vendor_id', mergeVendorId);

  if (itemsError) throw new Error(itemsError.message);

  const { error: incidentsError } = await supabase
    .from('vendor_incidents')
    .update({ vendor_id: keepVendorId })
    .eq('vendor_id', mergeVendorId);

  if (incidentsError) throw new Error(incidentsError.message);

  const mergedNotes = [
    keep.notes,
    `Merged duplicate "${merge.name}" (${mergeVendorId}) on ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { data: updatedKeep, error: keepUpdateError } = await supabase
    .from('vendors')
    .update({
      total_orders: keep.total_orders + merge.total_orders,
      quality_issues: keep.quality_issues + merge.quality_issues,
      contact_phone: keep.contact_phone ?? merge.contact_phone,
      contact_name: keep.contact_name ?? merge.contact_name,
      location_in_market: keep.location_in_market ?? merge.location_in_market,
      verification_status:
        keep.verification_status === VENDOR_VERIFICATION_STATUS.ACTIVE ||
        merge.verification_status === VENDOR_VERIFICATION_STATUS.ACTIVE
          ? VENDOR_VERIFICATION_STATUS.ACTIVE
          : keep.verification_status,
      notes: mergedNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', keepVendorId)
    .select()
    .single();

  if (keepUpdateError) throw new Error(keepUpdateError.message);

  const { error: deactivateError } = await supabase
    .from('vendors')
    .update({
      is_active: false,
      notes: `Merged into ${keep.name} (${keepVendorId}) on ${new Date().toISOString()}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mergeVendorId);

  if (deactivateError) throw new Error(deactivateError.message);

  for (const partId of affectedPartIds) {
    const { data: allPrices } = await supabase
      .from('vendor_parts')
      .select('average_price, price_count')
      .eq('part_id', partId);

    if (!allPrices?.length) continue;

    const totalWeighted = allPrices.reduce(
      (sum, row) => sum + row.average_price * row.price_count,
      0
    );
    const totalCount = allPrices.reduce((sum, row) => sum + row.price_count, 0);
    const catalogAverage =
      totalCount > 0 ? Math.round((totalWeighted / totalCount) * 100) / 100 : null;

    if (catalogAverage !== null) {
      await supabase
        .from('parts')
        .update({
          average_price: catalogAverage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partId);
    }
  }

  await writeAuditLog({
    userId: adminId,
    action: AUDIT_ACTIONS.VENDOR_MERGED,
    entityType: 'vendor',
    entityId: keepVendorId,
    oldValues: auditDetails(`Merged vendor ${merge.name}`, {
      mergeVendorId,
      mergeVendorName: merge.name,
    }),
    newValues: auditDetails(`Kept vendor ${keep.name}`, {
      keepVendorId,
      combinedOrders: updatedKeep.total_orders,
    }),
  });

  const { recalculateVendorReliability } = await import('@/lib/services/vendor-reliability');
  await recalculateVendorReliability(keepVendorId);

  return updatedKeep;
}

export interface AdminVendorDetail {
  vendor: Vendor;
  reliability: VendorReliabilityBreakdown;
  incidents: VendorIncidentRow[];
}

export async function getAdminVendorDetail(vendorId: string): Promise<AdminVendorDetail | null> {
  const supabase = createServiceClient();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error || !vendor) return null;

  const reliability = await buildVendorReliabilityBreakdown(
    supabase,
    vendorId,
    vendor.total_orders ?? 0,
    vendor.quality_issues ?? 0
  );
  const incidents = await listVendorIncidents(supabase, vendorId, 50);

  return {
    vendor: vendor as Vendor,
    reliability,
    incidents,
  };
}
