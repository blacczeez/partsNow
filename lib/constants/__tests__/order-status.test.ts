import { describe, it, expect } from 'vitest';
import {
  canAdminReassignRider,
  canAssignRiderToOrder,
  canRiderConfirmPickup,
} from '../order-status';

describe('canAdminReassignRider', () => {
  it('allows reassignment only after runner handoff or during delivery', () => {
    expect(canAdminReassignRider('picked')).toBe(true);
    expect(canAdminReassignRider('dispatched')).toBe(true);
  });

  it('blocks reassignment while runner is still sourcing', () => {
    expect(canAdminReassignRider('pending')).toBe(false);
    expect(canAdminReassignRider('confirmed')).toBe(false);
    expect(canAdminReassignRider('sourcing')).toBe(false);
  });

  it('blocks reassignment for terminal orders', () => {
    expect(canAdminReassignRider('delivered')).toBe(false);
    expect(canAdminReassignRider('cancelled')).toBe(false);
    expect(canAdminReassignRider('failed')).toBe(false);
    expect(canAdminReassignRider('rejected')).toBe(false);
  });
});

describe('canAssignRiderToOrder', () => {
  it('allows auto-assign only when parts are at the gate', () => {
    expect(canAssignRiderToOrder('picked')).toBe(true);
    expect(canAssignRiderToOrder('sourcing')).toBe(false);
    expect(canAssignRiderToOrder('dispatched')).toBe(false);
  });
});

describe('canRiderConfirmPickup', () => {
  it('allows pickup confirmation only for picked orders', () => {
    expect(canRiderConfirmPickup('picked')).toBe(true);
    expect(canRiderConfirmPickup('sourcing')).toBe(false);
    expect(canRiderConfirmPickup('dispatched')).toBe(false);
  });
});
