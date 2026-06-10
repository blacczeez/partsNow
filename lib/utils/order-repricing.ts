import { config } from '@/lib/config';

export interface OrderItemForRepricing {
  quantity: number;
  vendor_price: number | null;
  selling_price: number;
  is_found: boolean;
  is_unavailable: boolean;
}

export interface RepricedOrderTotals {
  subtotal: number;
  markupAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
}

export function recalculateOrderTotalsFromItems(
  items: OrderItemForRepricing[],
  options: {
    markupPercentage?: number;
    deliveryFee: number;
    discountAmount: number;
  }
): RepricedOrderTotals {
  const markupPercentage = options.markupPercentage ?? config.business.defaultMarkupPercentage;

  const vendorSubtotal = items
    .filter((i) => i.is_found && !i.is_unavailable)
    .reduce((sum, i) => {
      const unitVendor =
        i.vendor_price ?? Math.round(i.selling_price / (1 + markupPercentage / 100));
      return sum + unitVendor * i.quantity;
    }, 0);

  const markupAmount = Math.round(vendorSubtotal * (markupPercentage / 100));
  const total =
    vendorSubtotal + markupAmount + options.deliveryFee - options.discountAmount;

  return {
    subtotal: vendorSubtotal,
    markupAmount,
    deliveryFee: options.deliveryFee,
    discountAmount: options.discountAmount,
    total: Math.max(0, total),
  };
}

export function sellingPriceFromVendor(vendorPrice: number, markupPercentage?: number): number {
  const markup = markupPercentage ?? config.business.defaultMarkupPercentage;
  return Math.round(vendorPrice * (1 + markup / 100));
}
