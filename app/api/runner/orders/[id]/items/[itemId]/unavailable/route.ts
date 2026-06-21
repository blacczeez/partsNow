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
  const parsed = markItemUnavailableSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await markItemUnavailable(
      auth.user.id,
      id,
      itemId,
      parsed.data.reason
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark item as unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
