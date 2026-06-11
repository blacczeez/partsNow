import { createServiceClient } from '@/lib/supabase/service';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

/**
 * Records a vendor-part price observation from a runner's sourcing activity.
 * Uses the service role client to bypass RLS (runners don't have write access
 * to vendor_parts).
 *
 * - Upserts vendor_parts: updates last_price, increments price_count,
 *   recalculates rolling average.
 * - Recalculates parts.average_price from all vendor_parts rows for that part.
 */
export async function recordVendorPartPrice(
  vendorId: string,
  partId: string,
  price: number,
  actorId?: string
): Promise<void> {
  const supabase = createServiceClient();

  // Check if a vendor_parts row already exists
  const { data: existing } = await supabase
    .from('vendor_parts')
    .select('id, price_count, average_price')
    .eq('vendor_id', vendorId)
    .eq('part_id', partId)
    .single();

  if (existing) {
    // Rolling average: new_avg = (old_avg * old_count + new_price) / (old_count + 1)
    const newCount = existing.price_count + 1;
    const newAverage =
      (existing.average_price * existing.price_count + price) / newCount;

    await supabase
      .from('vendor_parts')
      .update({
        last_price: price,
        price_count: newCount,
        average_price: Math.round(newAverage * 100) / 100,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    await writeAuditLog({
      userId: actorId ?? null,
      action: AUDIT_ACTIONS.VENDOR_PART_PRICE_UPDATED,
      entityType: 'vendor_part',
      entityId: existing.id,
      newValues: auditDetails(`Vendor part price updated to ₦${price}`, {
        vendorId,
        partId,
        price,
        priceCount: newCount,
      }),
    });
  } else {
    // First observation — insert new row
    const { data: inserted } = await supabase
      .from('vendor_parts')
      .insert({
        vendor_id: vendorId,
        part_id: partId,
        last_price: price,
        price_count: 1,
        average_price: price,
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    await writeAuditLog({
      userId: actorId ?? null,
      action: AUDIT_ACTIONS.VENDOR_PART_LINKED,
      entityType: 'vendor_part',
      entityId: inserted?.id ?? partId,
      newValues: auditDetails(`Vendor linked to part at ₦${price}`, {
        vendorId,
        partId,
        price,
      }),
    });
  }

  // Recalculate parts.average_price from all vendor_parts for this part
  const { data: allPrices } = await supabase
    .from('vendor_parts')
    .select('average_price, price_count')
    .eq('part_id', partId);

  if (allPrices && allPrices.length > 0) {
    const totalWeighted = allPrices.reduce(
      (sum: number, row: { average_price: number; price_count: number }) =>
        sum + row.average_price * row.price_count,
      0
    );
    const totalCount = allPrices.reduce(
      (sum: number, row: { price_count: number }) => sum + row.price_count,
      0
    );
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
}
