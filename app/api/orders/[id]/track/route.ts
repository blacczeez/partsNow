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

  // Verify ownership
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, customer_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Get tracking data
  const { data: tracking } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('order_id', id)
    .single();

  // Get rider info if assigned
  let rider = null;
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .eq('order_id', id)
    .eq('role', 'rider')
    .single();

  if (assignment) {
    const { data: riderData } = await supabase
      .from('users')
      .select('full_name, phone')
      .eq('id', assignment.assignee_id)
      .single();
    rider = riderData;
  }

  return NextResponse.json({
    orderId: id,
    status: order.status,
    tracking: tracking
      ? {
          latitude: tracking.current_latitude,
          longitude: tracking.current_longitude,
          etaMinutes: tracking.eta_minutes,
          partnerTrackingUrl: tracking.partner_tracking_url,
        }
      : null,
    rider,
  });
}
