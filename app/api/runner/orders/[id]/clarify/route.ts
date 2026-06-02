import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { requestClarification } from '@/lib/services/runner';
import { clarifyOrderSchema } from '@/lib/validators/runner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const result = clarifyOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    await requestClarification(auth.user.id, id, result.data.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to request clarification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
