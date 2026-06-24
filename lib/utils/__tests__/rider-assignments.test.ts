import { describe, expect, it } from 'vitest';
import { riderAssignmentReleaseAction } from '@/lib/utils/rider-assignments';

describe('riderAssignmentReleaseAction', () => {
  it('fails assignments for cancelled orders', () => {
    expect(riderAssignmentReleaseAction('cancelled', null)).toBe('fail');
  });

  it('fails assignments when price review was cancelled', () => {
    expect(riderAssignmentReleaseAction('picked', 'cancelled')).toBe('fail');
  });

  it('completes assignments when order was delivered', () => {
    expect(riderAssignmentReleaseAction('delivered', null)).toBe('complete');
  });

  it('fails assignments while runner is still sourcing', () => {
    expect(riderAssignmentReleaseAction('pending', null)).toBe('fail');
    expect(riderAssignmentReleaseAction('confirmed', null)).toBe('fail');
    expect(riderAssignmentReleaseAction('sourcing', null)).toBe('fail');
  });

  it('keeps assignments active for picked orders ready for pickup', () => {
    expect(riderAssignmentReleaseAction('picked', 'none')).toBeNull();
    expect(riderAssignmentReleaseAction('picked', 'pending')).toBeNull();
    expect(riderAssignmentReleaseAction('dispatched', null)).toBeNull();
  });
});
