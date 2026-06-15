import { describe, expect, it } from 'vitest';
import { runnerAssignmentReleaseAction } from '@/lib/utils/runner-assignments';

describe('runnerAssignmentReleaseAction', () => {
  it('fails assignments for cancelled orders', () => {
    expect(runnerAssignmentReleaseAction('cancelled', null)).toBe('fail');
  });

  it('fails assignments when price review was cancelled', () => {
    expect(runnerAssignmentReleaseAction('sourcing', 'cancelled')).toBe('fail');
  });

  it('completes assignments when order was already picked', () => {
    expect(runnerAssignmentReleaseAction('picked', null)).toBe('complete');
  });

  it('keeps assignments active for in-progress sourcing', () => {
    expect(runnerAssignmentReleaseAction('sourcing', 'none')).toBeNull();
    expect(runnerAssignmentReleaseAction('confirmed', null)).toBeNull();
  });
});
