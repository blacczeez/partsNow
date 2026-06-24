export interface SourcingSavingsItem {
  quantity: number;
  vendor_price: number | null;
  expected_vendor_price: number | null;
  is_found?: boolean;
}

/** Extra platform margin when vendor price is below the sourcing target budget. */
export function lineSourcingSavings(item: SourcingSavingsItem): number {
  if (item.is_found === false) return 0;

  const { vendor_price, expected_vendor_price, quantity } = item;
  if (vendor_price == null || expected_vendor_price == null) return 0;
  if (vendor_price >= expected_vendor_price) return 0;

  return (expected_vendor_price - vendor_price) * quantity;
}

export function sumSourcingSavings(items: SourcingSavingsItem[]): number {
  return items.reduce((sum, item) => sum + lineSourcingSavings(item), 0);
}
