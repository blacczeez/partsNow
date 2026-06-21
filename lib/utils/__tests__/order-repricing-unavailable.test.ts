import { describe, expect, it } from 'vitest';
import {
  isRunnerUnavailableRejection,
  RUNNER_UNAVAILABLE_REJECTION_PREFIX,
} from '@/lib/constants/runner-unavailable';
import { recalculateOrderTotalsExcludingUnavailable } from '@/lib/utils/order-repricing';

describe('isRunnerUnavailableRejection', () => {
  it('matches runner unavailable rejection reasons', () => {
    expect(
      isRunnerUnavailableRejection(`${RUNNER_UNAVAILABLE_REJECTION_PREFIX}:item-1:Out of stock`)
    ).toBe(true);
    expect(isRunnerUnavailableRejection('Runner withdrew')).toBe(false);
  });
});

describe('recalculateOrderTotalsExcludingUnavailable', () => {
  it('drops unavailable lines from customer total', () => {
    const result = recalculateOrderTotalsExcludingUnavailable(
      [
        { quantity: 1, selling_price: 11500, is_unavailable: false },
        { quantity: 1, selling_price: 5750, is_unavailable: true },
      ],
      { deliveryFee: 1500, discountAmount: 0 }
    );

    expect(result.total).toBe(11500 + 1500);
  });

  it('returns delivery only when all items unavailable', () => {
    const result = recalculateOrderTotalsExcludingUnavailable(
      [{ quantity: 1, selling_price: 11500, is_unavailable: true }],
      { deliveryFee: 1500, discountAmount: 0 }
    );

    expect(result.total).toBe(1500);
  });
});
