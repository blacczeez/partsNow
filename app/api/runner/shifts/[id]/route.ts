import { NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerShiftDetail } from '@/lib/services/runner';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const shift = await getRunnerShiftDetail(auth.user.id, id);

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    return NextResponse.json({ shift });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load shift';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
