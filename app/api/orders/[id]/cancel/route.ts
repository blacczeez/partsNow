import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creditWallet } from '@/lib/services/wallet';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only allow cancellation of pending/confirmed orders
  if (!['pending', 'confirmed'].includes(order.status)) {
    return NextResponse.json(
      { error: 'Cannot cancel order in current status' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      internal_notes: body.reason
        ? `Cancelled by customer: ${body.reason}`
        : 'Cancelled by customer',
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }

  // Refund wallet if paid
  if (order.payment_status === 'paid' && order.payment_method === 'wallet') {
    await creditWallet(
      user.id,
      order.total,
      order.id,
      `Refund for cancelled order ${order.order_number}`
    );

    await supabase
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', id);
  }

  return NextResponse.json({ success: true });
}
