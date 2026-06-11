import { describe, it, expect } from 'vitest';
import {
  requiresPartnerDispatchOnly,
  shouldOfferPartnerDispatch,
} from '../partner-dispatch';

describe('partner dispatch eligibility', () => {
  it('offers partner dispatch for van and partner vehicle types', () => {
    expect(shouldOfferPartnerDispatch('van')).toBe(true);
    expect(shouldOfferPartnerDispatch('partner')).toBe(true);
    expect(shouldOfferPartnerDispatch('bike')).toBe(false);
    expect(shouldOfferPartnerDispatch('car')).toBe(false);
  });

  it('requires partner-only dispatch for partner vehicle type', () => {
    expect(requiresPartnerDispatchOnly('partner')).toBe(true);
    expect(requiresPartnerDispatchOnly('van')).toBe(false);
    expect(requiresPartnerDispatchOnly('car')).toBe(false);
  });
});
