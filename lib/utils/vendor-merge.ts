export interface VendorPartPriceRow {
  last_price: number;
  price_count: number;
  average_price: number;
  last_seen_at: string;
}

/** Combine two vendor_parts price rows when merging duplicate vendors. */
export function combineVendorPartRows(
  keep: VendorPartPriceRow,
  merge: VendorPartPriceRow
): VendorPartPriceRow {
  const price_count = keep.price_count + merge.price_count;
  const average_price =
    price_count > 0
      ? Math.round(
          ((keep.average_price * keep.price_count +
            merge.average_price * merge.price_count) /
            price_count) *
            100
        ) / 100
      : keep.average_price;

  const keepSeen = new Date(keep.last_seen_at).getTime();
  const mergeSeen = new Date(merge.last_seen_at).getTime();
  const mergeIsNewer = mergeSeen > keepSeen;

  return {
    price_count,
    average_price,
    last_price: mergeIsNewer ? merge.last_price : keep.last_price,
    last_seen_at: mergeIsNewer ? merge.last_seen_at : keep.last_seen_at,
  };
}
