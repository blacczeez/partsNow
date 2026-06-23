import { describe, expect, it } from 'vitest';
import {
  computeShiftDiscrepancy,
  formatShiftDiscrepancyLabel,
  getShiftReconciliationStatus,
} from '@/lib/utils/shift-reconciliation';

describe('computeShiftDiscrepancy', () => {
  it('returns 0 when ending float is null (active shift)', () => {
    expect(
      computeShiftDiscrepancy({
        startingFloat: 100_000,
        totalSourced: 40_000,
        endingFloat: null,
      })
    ).toBe(0);
  });

  it('returns 0 when float matches sourcing records', () => {
    expect(
      computeShiftDiscrepancy({
        startingFloat: 100_000,
        totalSourced: 80_000,
        endingFloat: 20_000,
      })
    ).toBe(0);
  });

  it('returns negative when runner is short', () => {
    expect(
      computeShiftDiscrepancy({
        startingFloat: 100_000,
        totalSourced: 80_000,
        endingFloat: 18_000,
      })
    ).toBe(-2_000);
  });

  it('returns positive when runner has extra cash', () => {
    expect(
      computeShiftDiscrepancy({
        startingFloat: 100_000,
        totalSourced: 80_000,
        endingFloat: 22_000,
      })
    ).toBe(2_000);
  });
});

describe('formatShiftDiscrepancyLabel', () => {
  it('labels balanced, short, and over amounts', () => {
    expect(formatShiftDiscrepancyLabel(0)).toBe('Balanced');
    expect(formatShiftDiscrepancyLabel(-2000)).toContain('Short');
    expect(formatShiftDiscrepancyLabel(500)).toContain('Over');
  });
});

describe('getShiftReconciliationStatus', () => {
  it('maps shift fields to status', () => {
    expect(
      getShiftReconciliationStatus({ ended_at: null, is_reconciled: false })
    ).toBe('active');
    expect(
      getShiftReconciliationStatus({
        ended_at: '2026-01-01T00:00:00Z',
        is_reconciled: false,
      })
    ).toBe('pending');
    expect(
      getShiftReconciliationStatus({
        ended_at: '2026-01-01T00:00:00Z',
        is_reconciled: true,
      })
    ).toBe('reconciled');
  });
});
