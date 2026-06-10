import { createServiceClient } from '@/lib/supabase/service';

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
  price: number
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
  } else {
    // First observation — insert new row
    await supabase.from('vendor_parts').insert({
      vendor_id: vendorId,
      part_id: partId,
      last_price: price,
      price_count: 1,
      average_price: price,
    });
  }

  // Recalculate parts.average_price from all vendor_parts for this part
  const { data: allVendorPrices } = await supabase
    .from('vendor_parts')
    .select('average_price')
    .eq('part_id', partId);

  if (allVendorPrices && allVendorPrices.length > 0) {
    const overallAvg =
      allVendorPrices.reduce(
        (sum: number, vp: { average_price: number }) => sum + vp.average_price,
        0
      ) / allVendorPrices.length;

    await supabase
      .from('parts')
      .update({
        average_price: Math.round(overallAvg * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', partId);
  }
}
