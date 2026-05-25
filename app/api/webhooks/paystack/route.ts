import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/integrations/paystack';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';

  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { event, data } = payload;

  const supabase = await createClient();

  switch (event) {
    case 'charge.success': {
      const { metadata, reference, amount } = data;
      const amountNaira = amount / 100;

      if (metadata?.type === 'wallet_topup') {
        // Credit the wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', metadata.user_id)
          .single();

        if (wallet) {
          await supabase.rpc('credit_wallet', {
            p_wallet_id: wallet.id,
            p_amount: amountNaira,
            p_reference: reference,
            p_description: `Wallet top-up via Paystack`,
          });
        }

        // Log payment event
        await supabase.from('payment_events').insert({
          wallet_id: wallet?.id,
          type: 'charge_succeeded',
          amount: amountNaira,
          provider: 'paystack',
          provider_reference: reference,
          status: 'success',
          raw_response: data,
        });
      } else if (metadata?.type === 'order_payment') {
        // Confirm order payment
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_reference: reference,
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', metadata.order_id)
          .eq('payment_status', 'pending');

        // Log payment event
        await supabase.from('payment_events').insert({
          order_id: metadata.order_id,
          type: 'charge_succeeded',
          amount: amountNaira,
          provider: 'paystack',
          provider_reference: reference,
          status: 'success',
          raw_response: data,
        });
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
