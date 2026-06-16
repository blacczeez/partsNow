import { NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerOrders } from '@/lib/services/runner';
import { maybeRunScheduledJobs } from '@/lib/services/scheduled-jobs';

export async function GET() {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  void maybeRunScheduledJobs();

  try {
    const orders = await getRunnerOrders(auth.user.id);
    return NextResponse.json({ orders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
