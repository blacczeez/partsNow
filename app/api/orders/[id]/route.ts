import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
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

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_assignments(*), delivery_tracking(*)')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: deliveryAttempts } = await supabase
    .from('delivery_attempts')
    .select('attempt_number, status, failure_reason, notes, attempted_at')
    .eq('order_id', id)
    .order('attempt_number', { ascending: false })
    .limit(5);

  return NextResponse.json({
    order: {
      ...order,
      delivery_attempts: deliveryAttempts ?? [],
    },
  });
}
