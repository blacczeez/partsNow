import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { rejectOrder } from '@/lib/services/runner';
import { rejectOrderSchema } from '@/lib/validators/runner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const result = rejectOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    await rejectOrder(auth.user.id, id, result.data.reason);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reject order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
