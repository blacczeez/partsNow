import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerOrderDetail } from '@/lib/services/runner';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const order = await getRunnerOrderDetail(auth.user.id, id);
    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
