import { NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerShiftDetail } from '@/lib/services/runner';
import { getRuntimeConfig } from '@/lib/services/runtime-config';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const [shift, runtime] = await Promise.all([
      getRunnerShiftDetail(auth.user.id, id),
      getRuntimeConfig(),
    ]);

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    return NextResponse.json({
      shift,
      commissionPerOrder: runtime.runner.commissionPerOrder,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load shift';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
