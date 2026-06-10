import { describe, it, expect } from 'vitest';
import { recalculateOrderTotalsFromItems } from '../order-repricing';

describe('recalculateOrderTotalsFromItems', () => {
  it('recalculates total from actual vendor prices', () => {
    const result = recalculateOrderTotalsFromItems(
      [
        {
          quantity: 1,
          vendor_price: 4000,
          selling_price: 1700,
          is_found: true,
          is_unavailable: false,
        },
      ],
      { deliveryFee: 1500, discountAmount: 0 }
    );

    expect(result.subtotal).toBe(4000);
    expect(result.markupAmount).toBe(600);
    expect(result.total).toBe(6100);
  });
});
