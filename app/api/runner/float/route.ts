import { NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerFloat } from '@/lib/services/runner';

export async function GET() {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  try {
    const float = await getRunnerFloat(auth.user.id);
    return NextResponse.json({ float });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get float';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
