import { describe, expect, it } from 'vitest';
import {
  computeReliabilityScoreFromCounts,
  RELIABILITY_PENALTIES,
  RELIABILITY_POSITIVE_CAP,
  RELIABILITY_POSITIVE_PER_ORDER,
} from '@/lib/services/vendor-reliability';

describe('computeReliabilityScoreFromCounts', () => {
  it('starts at 100 with no incidents', () => {
    const result = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 0,
      pendingQualityIssues: 0,
      confirmedPriceDiscrepancies: 0,
      confirmedOutOfStock: 0,
      rejectedIncidents: 0,
      positiveOrderCredits: 0,
    });
    expect(result.score).toBe(100);
    expect(result.qualityPenalty).toBe(0);
    expect(result.positiveBonus).toBe(0);
  });

  it('applies penalties for confirmed incidents', () => {
    const result = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 1,
      pendingQualityIssues: 2,
      confirmedPriceDiscrepancies: 2,
      confirmedOutOfStock: 1,
      rejectedIncidents: 0,
      positiveOrderCredits: 0,
    });

    const expected =
      100 -
      RELIABILITY_PENALTIES.quality_issue -
      2 * RELIABILITY_PENALTIES.price_discrepancy -
      RELIABILITY_PENALTIES.out_of_stock;

    expect(result.score).toBe(expected);
    expect(result.qualityPenalty).toBe(RELIABILITY_PENALTIES.quality_issue);
  });

  it('caps positive bonus at 10', () => {
    const result = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 0,
      pendingQualityIssues: 0,
      confirmedPriceDiscrepancies: 0,
      confirmedOutOfStock: 0,
      rejectedIncidents: 0,
      positiveOrderCredits: 10,
    });

    expect(result.positiveBonus).toBe(RELIABILITY_POSITIVE_CAP);
    expect(result.score).toBe(100);
  });

  it('does not count pending quality issues toward penalty', () => {
    const withPending = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 0,
      pendingQualityIssues: 5,
      confirmedPriceDiscrepancies: 0,
      confirmedOutOfStock: 0,
      rejectedIncidents: 0,
      positiveOrderCredits: 0,
    });
    expect(withPending.score).toBe(100);
  });

  it('clamps score between 0 and 100', () => {
    const low = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 10,
      pendingQualityIssues: 0,
      confirmedPriceDiscrepancies: 0,
      confirmedOutOfStock: 0,
      rejectedIncidents: 0,
      positiveOrderCredits: 0,
    });
    expect(low.score).toBe(0);

    const high = computeReliabilityScoreFromCounts({
      confirmedQualityIssues: 0,
      pendingQualityIssues: 0,
      confirmedPriceDiscrepancies: 0,
      confirmedOutOfStock: 0,
      rejectedIncidents: 0,
      positiveOrderCredits: 3,
    });
    expect(high.positiveBonus).toBe(3 * RELIABILITY_POSITIVE_PER_ORDER);
    expect(high.score).toBe(100);
  });
});
