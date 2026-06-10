import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  acceptCustomerPriceChange,
  discardCustomerPriceChange,
  finalizeCustomerPriceAcceptance,
} from '@/lib/services/price-review';

const bodySchema = z.object({
  action: z.enum(['accept', 'discard']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (parsed.data.action === 'discard') {
      await discardCustomerPriceChange(supabase, user.id, orderId);
      return NextResponse.json({ success: true, action: 'discarded' });
    }

    const result = await acceptCustomerPriceChange(supabase, user.id, orderId);

    if (result.paymentUrl) {
      return NextResponse.json({
        success: true,
        action: 'payment_required',
        paymentUrl: result.paymentUrl,
      });
    }

    return NextResponse.json({ success: true, action: 'accepted' });
  } catch (error) {
    console.error('Price response error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Paystack return after card top-up for price change */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('finalize') !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const { id: orderId } = await params;
    await finalizeCustomerPriceAcceptance(supabase, orderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
