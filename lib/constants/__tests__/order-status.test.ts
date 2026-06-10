import { describe, it, expect } from 'vitest';
import { canAdminReassignRider } from '../order-status';

describe('canAdminReassignRider', () => {
  it('allows reassignment while delivery is in progress', () => {
    expect(canAdminReassignRider('pending')).toBe(true);
    expect(canAdminReassignRider('confirmed')).toBe(true);
    expect(canAdminReassignRider('sourcing')).toBe(true);
    expect(canAdminReassignRider('picked')).toBe(true);
    expect(canAdminReassignRider('dispatched')).toBe(true);
  });

  it('blocks reassignment for terminal orders', () => {
    expect(canAdminReassignRider('delivered')).toBe(false);
    expect(canAdminReassignRider('cancelled')).toBe(false);
    expect(canAdminReassignRider('failed')).toBe(false);
    expect(canAdminReassignRider('rejected')).toBe(false);
  });
});
