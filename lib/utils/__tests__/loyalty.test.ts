import { describe, it, expect } from 'vitest';
import {
  calculateLoyaltySavings,
  calculateLoyaltyTierFromStats,
  getLoyaltyProgress,
  isLoyaltyUpgrade,
} from '../loyalty';
import { getDefaultLoyaltyThresholds } from '@/lib/services/loyalty-config';

const thresholds = getDefaultLoyaltyThresholds();

describe('calculateLoyaltyTierFromStats', () => {
  it('assigns partner when orders and spend qualify', () => {
    expect(calculateLoyaltyTierFromStats(50, 500_000, thresholds)).toBe('partner');
  });

  it('assigns trusted at 20 orders', () => {
    expect(calculateLoyaltyTierFromStats(20, 0, thresholds)).toBe('trusted');
  });

  it('assigns verified at 5 orders', () => {
    expect(calculateLoyaltyTierFromStats(5, 0, thresholds)).toBe('verified');
  });
});

describe('getLoyaltyProgress', () => {
  it('shows progress to verified from new', () => {
    const progress = getLoyaltyProgress('new', 2, 0, thresholds);
    expect(progress.nextTier).toBe('verified');
    expect(progress.ordersRemaining).toBe(3);
  });

  it('partner has no next tier', () => {
    const progress = getLoyaltyProgress('partner', 60, 600_000, thresholds);
    expect(progress.nextTier).toBeNull();
  });
});

describe('isLoyaltyUpgrade', () => {
  it('detects upgrades', () => {
    expect(isLoyaltyUpgrade('new', 'verified')).toBe(true);
    expect(isLoyaltyUpgrade('trusted', 'verified')).toBe(false);
  });
});

describe('calculateLoyaltySavings', () => {
  it('returns savings for trusted tier', () => {
    expect(calculateLoyaltySavings(10_000, 'trusted')).toBe(500);
  });
});
