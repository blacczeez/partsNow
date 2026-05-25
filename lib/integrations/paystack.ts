import { config } from '@/lib/config';

const PAYSTACK_API = 'https://api.paystack.co';

interface InitializePaymentParams {
  email: string;
  amount: number; // In Naira (converted to kobo internally)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentResult {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
}

export async function initializePayment(
  params: InitializePaymentParams
): Promise<PaymentResult> {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // Convert Naira to kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize payment');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    accessCode: data.data.access_code,
  };
}

interface VerifyPaymentResult {
  status: 'success' | 'failed' | 'abandoned';
  amount: number; // In Naira
  reference: string;
  paidAt: string;
  channel: string;
  metadata: Record<string, unknown>;
}

export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResult> {
  const response = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${config.payments.paystackSecretKey}`,
      },
    }
  );

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify payment');
  }

  return {
    status: data.data.status,
    amount: data.data.amount / 100, // Convert kobo to Naira
    reference: data.data.reference,
    paidAt: data.data.paid_at,
    channel: data.data.channel,
    metadata: data.data.metadata || {},
  };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', config.payments.paystackSecretKey)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
