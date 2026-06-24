import { describe, expect, it } from 'vitest';
import {
  assertPartialRefundWithinCeiling,
  getPartialRefundCeiling,
} from '@/lib/services/order-refund';
import {
  computePartialRefundForUnavailableMark,
  itemsAfterUnavailableMark,
} from '@/lib/services/runner-unavailable';
import { recalculateOrderTotalsExcludingUnavailable } from '@/lib/utils/order-repricing';

describe('computePartialRefundForUnavailableMark', () => {
  it('refunds the drop in outstanding total for prepaid orders', () => {
    expect(computePartialRefundForUnavailableMark(13000, 1500, 'paid')).toBe(11500);
    expect(
      computePartialRefundForUnavailableMark(13000, 1500, 'partially_refunded')
    ).toBe(11500);
  });

  it('returns zero for COD or when total does not drop', () => {
    expect(computePartialRefundForUnavailableMark(13000, 1500, 'pending')).toBe(0);
    expect(computePartialRefundForUnavailableMark(13000, 13000, 'paid')).toBe(0);
  });
});

describe('unavailable reprice + refund ceiling', () => {
  it('single prepaid part + delivery refunds part amount against pre-reprice total', () => {
    const items = itemsAfterUnavailableMark(
      [{ id: 'item-1', quantity: 1, selling_price: 11500, is_unavailable: false }],
      'item-1'
    );
    const repriced = recalculateOrderTotalsExcludingUnavailable(items, {
      deliveryFee: 1500,
      discountAmount: 0,
    });

    const previousTotal = 13000;
    const partialRefundAmount = computePartialRefundForUnavailableMark(
      previousTotal,
      repriced.total,
      'paid'
    );

    expect(repriced.total).toBe(1500);
    expect(partialRefundAmount).toBe(11500);
    expect(() =>
      assertPartialRefundWithinCeiling(partialRefundAmount, previousTotal)
    ).not.toThrow();
    expect(() =>
      assertPartialRefundWithinCeiling(partialRefundAmount, repriced.total)
    ).toThrow('Partial refund exceeds amount paid');
  });

  it('second unavailable mark refunds only the additional drop', () => {
    const items = itemsAfterUnavailableMark(
      [
        { id: 'item-1', quantity: 1, selling_price: 11500, is_unavailable: true },
        { id: 'item-2', quantity: 1, selling_price: 11500, is_unavailable: false },
      ],
      'item-2'
    );
    const repriced = recalculateOrderTotalsExcludingUnavailable(items, {
      deliveryFee: 1500,
      discountAmount: 0,
    });

    const previousTotal = 13000;
    const partialRefundAmount = computePartialRefundForUnavailableMark(
      previousTotal,
      repriced.total,
      'partially_refunded'
    );

    expect(repriced.total).toBe(1500);
    expect(partialRefundAmount).toBe(11500);
    expect(getPartialRefundCeiling({ total: 13000, revised_total: previousTotal })).toBe(
      13000
    );
  });
});
