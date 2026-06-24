import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateOrderSchema } from '@/lib/validators/order';
import { applyRatingReliabilityCredits } from '@/lib/services/part-reports';

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
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'Can only rate delivered orders' },
      { status: 400 }
    );
  }

  if (order.rating) {
    return NextResponse.json(
      { error: 'Order already rated' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = rateOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      rating: result.data.rating,
      rating_comment: result.data.comment || null,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }

  applyRatingReliabilityCredits(id).catch(() => {});

  return NextResponse.json({ success: true });
}
