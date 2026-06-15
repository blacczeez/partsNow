import { NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { releaseAssignedDeliveriesForLogout } from '@/lib/services/rider';

export async function POST() {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  try {
    const summary = await releaseAssignedDeliveriesForLogout(auth.user.id);
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to release pending deliveries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
