import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creditWallet } from '@/lib/services/wallet';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

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
      `Refund for cancelled order ${order.order_number}`,
      {
        metadata: {
          kind: 'refund',
          source: 'refund',
          order_id: order.id,
          order_number: order.order_number,
        },
      }
    );

    await supabase
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', id);
  }

  await writeAuditLog({
    userId: user.id,
    action: AUDIT_ACTIONS.ORDER_CANCELLED,
    entityType: 'order',
    entityId: id,
    oldValues: { status: order.status, paymentStatus: order.payment_status },
    newValues: auditDetails(`Customer cancelled ${order.order_number}`, {
      orderNumber: order.order_number,
      reason: body.reason ?? null,
      refunded: order.payment_status === 'paid' && order.payment_method === 'wallet',
    }),
  });

  return NextResponse.json({ success: true });
}
