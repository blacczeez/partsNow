import crypto from 'crypto';
import { verifyWebhookSignature } from '../paystack';
import { config } from '@/lib/config';

describe('verifyWebhookSignature', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { id: 1 } });

  function computeExpected(body: string): string {
    return crypto
      .createHmac('sha512', config.payments.paystackSecretKey)
      .update(body)
      .digest('hex');
  }

  it('returns true for a correct signature', () => {
    const sig = computeExpected(payload);
    expect(verifyWebhookSignature(payload, sig)).toBe(true);
  });

  it('returns false for a tampered payload', () => {
    const sig = computeExpected(payload);
    const tampered = JSON.stringify({ event: 'charge.success', data: { id: 2 } });
    expect(verifyWebhookSignature(tampered, sig)).toBe(false);
  });

  it('returns false for a wrong signature', () => {
    expect(verifyWebhookSignature(payload, 'abc123')).toBe(false);
  });

  it('returns false for an empty signature', () => {
    expect(verifyWebhookSignature(payload, '')).toBe(false);
  });
});
