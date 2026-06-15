import { describe, expect, it } from 'vitest';
import {
  groupRiderHistoryByDate,
  riderHistoryOutcome,
  riderTransitMinutes,
} from '@/lib/utils/rider-history';

describe('rider-history', () => {
  it('labels delivered outcomes', () => {
    expect(
      riderHistoryOutcome({
        assignment_status: 'completed',
        status: 'delivered',
        rejection_reason: null,
      }).label
    ).toBe('Delivered');
  });

  it('computes transit minutes from pickup to delivery', () => {
    const mins = riderTransitMinutes({
      pickup_confirmed_at: '2026-06-01T10:00:00.000Z',
      delivered_at: '2026-06-01T10:45:00.000Z',
      actual_delivery_minutes: 120,
    });
    expect(mins).toBe(45);
  });

  it('groups entries by relative date labels', () => {
    const today = new Date().toISOString();
    const groups = groupRiderHistoryByDate([
      {
        id: '1',
        assignment_id: 'a1',
        order_number: 'ORD-1',
        status: 'delivered',
        total: 1000,
        delivery_address: 'Lagos',
        payment_method: 'wallet',
        payment_status: 'paid',
        assignment_status: 'completed',
        assigned_at: today,
        pickup_confirmed_at: today,
        completed_at: today,
        delivered_at: today,
        dispatched_at: today,
        actual_delivery_minutes: 30,
        rejection_reason: null,
        customer_name: 'Test',
        customer_phone: '2348012345678',
        item_count: 1,
        items_summary: '1x Part',
        attempt_count: 1,
        last_failure_reason: null,
        is_high_value: false,
      },
    ]);
    expect(groups[0]?.label).toBe('Today');
  });
});
