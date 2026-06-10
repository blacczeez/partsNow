import { describe, it, expect } from 'vitest';
import { canConfirmPartsAtHub, PARTS_CUSTODY } from '../delivery-failure';

describe('canConfirmPartsAtHub', () => {
  it('allows with_rider', () => {
    expect(canConfirmPartsAtHub(PARTS_CUSTODY.WITH_RIDER, 'rejected')).toBe(true);
  });

  it('allows null on terminal orders', () => {
    expect(canConfirmPartsAtHub(null, 'rejected')).toBe(true);
    expect(canConfirmPartsAtHub(null, 'failed')).toBe(true);
  });

  it('blocks null on active orders', () => {
    expect(canConfirmPartsAtHub(null, 'dispatched')).toBe(false);
  });

  it('blocks already at hub', () => {
    expect(canConfirmPartsAtHub(PARTS_CUSTODY.AT_HUB, 'rejected')).toBe(false);
  });
});
