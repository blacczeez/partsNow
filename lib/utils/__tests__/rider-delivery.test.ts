import { describe, expect, it } from 'vitest';
import {
  countRiderLogoutBlockingDeliveries,
  riderDeliveryBlocksLogout,
} from '@/lib/utils/rider-delivery';

describe('rider-delivery', () => {
  it('blocks logout during in-transit delivery', () => {
    expect(
      riderDeliveryBlocksLogout({
        assignment_status: 'in_progress',
        price_review_status: 'none',
      })
    ).toBe(true);
  });

  it('does not block logout for pickup waiting on admin', () => {
    expect(
      riderDeliveryBlocksLogout({
        assignment_status: 'assigned',
        price_review_status: 'pending',
      })
    ).toBe(false);
  });

  it('blocks logout for assigned pickup ready to go', () => {
    expect(
      riderDeliveryBlocksLogout({
        assignment_status: 'assigned',
        price_review_status: 'none',
      })
    ).toBe(true);
  });

  it('counts only blocking deliveries', () => {
    expect(
      countRiderLogoutBlockingDeliveries([
        { assignment_status: 'assigned', price_review_status: 'pending' },
        { assignment_status: 'assigned', price_review_status: 'none' },
        { assignment_status: 'in_progress', price_review_status: 'none' },
      ])
    ).toBe(2);
  });
});
