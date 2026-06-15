import { describe, it, expect } from 'vitest';
import {
  getRunnerPriceReviewPhase,
  orderNeedsRunnerPriceReviewPolling,
  runnerPriceReviewBlocksHandoff,
  runnerOrderBlocksShiftEnd,
} from '../runner-price-review';

describe('runner-price-review', () => {
  it('detects admin review phase', () => {
    const order = { status: 'sourcing', price_review_status: 'pending', order_items: [] };
    expect(getRunnerPriceReviewPhase(order)).toBe('admin_review');
    expect(runnerPriceReviewBlocksHandoff('admin_review')).toBe(true);
    expect(orderNeedsRunnerPriceReviewPolling(order)).toBe(true);
  });

  it('detects customer decision phase', () => {
    const order = {
      status: 'sourcing',
      price_review_status: 'awaiting_customer',
      price_topup_amount: 1150,
      order_items: [{ price_review_status: 'awaiting_customer' }],
    };
    expect(getRunnerPriceReviewPhase(order)).toBe('customer_decision');
  });

  it('detects customer approved phase', () => {
    const order = {
      status: 'sourcing',
      price_review_status: 'resolved',
      order_items: [{ price_review_status: 'customer_approved' }],
    };
    expect(getRunnerPriceReviewPhase(order)).toBe('approved');
    expect(runnerPriceReviewBlocksHandoff('approved')).toBe(false);
  });

  it('detects cancellation after customer decline', () => {
    const order = {
      status: 'cancelled',
      price_review_status: 'cancelled',
      order_items: [{ price_review_status: 'awaiting_customer' }],
    };
    expect(getRunnerPriceReviewPhase(order)).toBe('cancelled');
  });

  it('does not block shift end while awaiting admin or customer', () => {
    expect(
      runnerOrderBlocksShiftEnd({
        assignment_status: 'in_progress',
        price_review_status: 'pending',
      })
    ).toBe(false);
    expect(
      runnerOrderBlocksShiftEnd({
        assignment_status: 'accepted',
        price_review_status: 'awaiting_customer',
      })
    ).toBe(false);
    expect(
      runnerOrderBlocksShiftEnd({
        assignment_status: 'in_progress',
        price_review_status: 'none',
      })
    ).toBe(true);
    expect(
      runnerOrderBlocksShiftEnd({
        assignment_status: 'assigned',
        price_review_status: 'pending',
      })
    ).toBe(true);
  });
});
