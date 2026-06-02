import { NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { getRiderOrders } from '@/lib/services/rider';

export async function GET() {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  try {
    const orders = await getRiderOrders(auth.user.id);
    return NextResponse.json({ orders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch deliveries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
