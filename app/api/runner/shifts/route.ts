import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerShiftHistory } from '@/lib/services/runner';

export async function GET(request: NextRequest) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getRunnerShiftHistory(auth.user.id, { page, limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load shift history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
