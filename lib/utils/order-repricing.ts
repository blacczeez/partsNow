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

/** Recalculate customer total excluding unavailable lines (pending lines keep quoted selling_price). */
export function recalculateOrderTotalsExcludingUnavailable(
  items: Array<{ quantity: number; selling_price: number; is_unavailable: boolean }>,
  options: {
    markupPercentage?: number;
    deliveryFee: number;
    discountAmount: number;
  }
): RepricedOrderTotals {
  const markupPercentage = options.markupPercentage ?? config.business.defaultMarkupPercentage;
  const partsCustomerTotal = items
    .filter((item) => !item.is_unavailable)
    .reduce((sum, item) => sum + item.selling_price * item.quantity, 0);

  const subtotal = Math.round(partsCustomerTotal / (1 + markupPercentage / 100));
  const markupAmount = partsCustomerTotal - subtotal;
  const total = Math.max(
    0,
    partsCustomerTotal + options.deliveryFee - options.discountAmount
  );

  return {
    subtotal,
    markupAmount,
    deliveryFee: options.deliveryFee,
    discountAmount: options.discountAmount,
    total,
  };
}

export function sellingPriceFromVendor(vendorPrice: number, markupPercentage?: number): number {
  const markup = markupPercentage ?? config.business.defaultMarkupPercentage;
  return Math.round(vendorPrice * (1 + markup / 100));
}
