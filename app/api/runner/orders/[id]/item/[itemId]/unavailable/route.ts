import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { markItemUnavailable } from '@/lib/services/runner';
import { markItemUnavailableSchema } from '@/lib/validators/runner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id, itemId } = await params;
  const body = await request.json();
  const result = markItemUnavailableSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    await markItemUnavailable(auth.user.id, id, itemId, result.data.reason);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark item as unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
