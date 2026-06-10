import { describe, it, expect } from 'vitest';
import { isCodAllowedForCustomer } from '../pricing';

describe('isCodAllowedForCustomer', () => {
  it('blocks COD when profile has cod_disabled', () => {
    expect(isCodAllowedForCustomer(5000, { cod_disabled: true })).toBe(false);
  });

  it('allows COD when under limit and not disabled', () => {
    expect(isCodAllowedForCustomer(5000, { cod_refusal_count: 1 })).toBe(true);
  });
});
