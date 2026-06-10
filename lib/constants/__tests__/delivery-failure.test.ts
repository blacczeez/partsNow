import { describe, it, expect } from 'vitest';
import {
  formatDeliveryFailureReason,
  requiresFailurePhoto,
} from '../delivery-failure';

describe('formatDeliveryFailureReason', () => {
  it('maps known reason codes to labels', () => {
    expect(formatDeliveryFailureReason('customer_unavailable')).toBe(
      'Customer unavailable'
    );
    expect(formatDeliveryFailureReason('wrong_address')).toBe('Wrong address');
  });

  it('falls back for unknown codes', () => {
    expect(formatDeliveryFailureReason('some_code')).toBe('some code');
  });
});

describe('requiresFailurePhoto', () => {
  it('requires photo for customer refused', () => {
    expect(requiresFailurePhoto('customer_refused', false, true)).toBe(true);
  });

  it('requires photo for high-value orders when configured', () => {
    expect(requiresFailurePhoto('other', true, true)).toBe(true);
    expect(requiresFailurePhoto('other', true, false)).toBe(false);
  });
});
