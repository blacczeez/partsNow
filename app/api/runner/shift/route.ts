import { NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getActiveShift } from '@/lib/services/runner';

export async function GET() {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  try {
    const shift = await getActiveShift(auth.user.id);
    return NextResponse.json({ shift });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get shift';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
