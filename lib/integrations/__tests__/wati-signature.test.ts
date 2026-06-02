import crypto from 'crypto';
import { verifyWatiWebhookSignature } from '../wati';
import { config } from '@/lib/config';

vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config');
  return {
    config: {
      ...actual.config,
      whatsapp: { ...actual.config.whatsapp },
    },
  };
});

describe('verifyWatiWebhookSignature', () => {
  const payload = JSON.stringify({ message: 'hello' });

  it('returns true when webhookSecret is empty (skips verification)', () => {
    (config.whatsapp as { webhookSecret: string }).webhookSecret = '';
    expect(verifyWatiWebhookSignature(payload, 'anything')).toBe(true);
  });

  it('returns true for correct signature when secret is set', () => {
    (config.whatsapp as { webhookSecret: string }).webhookSecret = 'test-secret';
    const expected = crypto
      .createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('hex');
    expect(verifyWatiWebhookSignature(payload, expected)).toBe(true);
  });

  it('returns false for wrong signature when secret is set', () => {
    (config.whatsapp as { webhookSecret: string }).webhookSecret = 'test-secret';
    expect(verifyWatiWebhookSignature(payload, 'wrong-sig')).toBe(false);
  });

  it('returns false for tampered payload when secret is set', () => {
    (config.whatsapp as { webhookSecret: string }).webhookSecret = 'test-secret';
    const sig = crypto
      .createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('hex');
    const tampered = JSON.stringify({ message: 'hacked' });
    expect(verifyWatiWebhookSignature(tampered, sig)).toBe(false);
  });
});
