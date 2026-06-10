import { config } from '@/lib/config';
import { computeVendorBudget } from '@/lib/utils/vendor-budget';
import { sellingPriceFromVendor } from '@/lib/utils/order-repricing';

export interface OrderItemForDisplay {
  quantity: number;
  selling_price: number;
  max_vendor_price?: number | null;
  expected_vendor_price?: number | null;
  vendor_price?: number | null;
  is_unavailable?: boolean;
}

/** Catalog/base unit price before service fee (matches checkout). */
export function catalogUnitPrice(
  item: Pick<OrderItemForDisplay, 'selling_price'>,
  orderSubtotal: number,
  orderMarkupAmount: number
): number {
  if (orderSubtotal <= 0) {
    return item.selling_price;
  }
  const markupRate = orderMarkupAmount / orderSubtotal;
  return Math.round(item.selling_price / (1 + markupRate));
}

/** Catalog line total before service fee. */
export function catalogLineTotal(
  item: OrderItemForDisplay,
  orderSubtotal: number,
  orderMarkupAmount: number
): number {
  return catalogUnitPrice(item, orderSubtotal, orderMarkupAmount) * item.quantity;
}


/** Listed/catalog line total (matches checkout item price and runner target). */
export function listedLineTotal(item: OrderItemForDisplay): number {
  return runnerLineExpectedBudget(item);
}

/** Service fee portion for one quoted item line. */
export function quotedServiceFeeLine(item: OrderItemForDisplay): number {
  return customerLineTotal(item) - listedLineTotal(item);
}

/** Part line breakdown from a vendor unit price (for price review estimates). */
export function partPricingFromVendorUnit(
  vendorUnitPrice: number,
  quantity: number,
  markupPercentage = config.business.defaultMarkupPercentage
): { listedLine: number; serviceFee: number; partTotal: number } {
  const unitSelling = sellingPriceFromVendor(vendorUnitPrice, markupPercentage);
  const listedLine = vendorUnitPrice * quantity;
  const partTotal = unitSelling * quantity;
  return { listedLine, serviceFee: partTotal - listedLine, partTotal };
}

/** Customer line total for one item (listed price + service fee). */
export function customerLineTotal(item: OrderItemForDisplay): number {
  return item.selling_price * item.quantity;
}

/** Sum of customer part line totals (excludes delivery). */
export function customerPartsTotal(items: OrderItemForDisplay[]): number {
  return items.reduce((sum, item) => sum + customerLineTotal(item), 0);
}

/** Expected vendor price per unit (negotiation target). */
export function runnerUnitExpectedBudget(item: OrderItemForDisplay): number {
  return (
    item.expected_vendor_price ??
    computeVendorBudget(item.selling_price).expectedVendorPrice
  );
}

/** Expected vendor cost for one line (negotiation target). */
export function runnerLineExpectedBudget(item: OrderItemForDisplay): number {
  return runnerUnitExpectedBudget(item) * item.quantity;
}

/** Total expected vendor budget for sourcing (negotiate at or below). */
export function runnerSourcingTargetTotal(items: OrderItemForDisplay[]): number {
  return items
    .filter((item) => !item.is_unavailable)
    .reduce((sum, item) => sum + runnerLineExpectedBudget(item), 0);
}

/** Absolute per-unit cap: vendor price cannot exceed customer part price. */
export function runnerUnitPriceCap(item: Pick<OrderItemForDisplay, 'selling_price'>): number {
  return item.selling_price;
}
