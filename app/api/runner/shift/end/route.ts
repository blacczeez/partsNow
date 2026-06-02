import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { endShift } from '@/lib/services/runner';
import { endShiftSchema } from '@/lib/validators/runner';

export async function POST(request: NextRequest) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const result = endShiftSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const shift = await endShift(auth.user.id, result.data.notes || undefined);
    return NextResponse.json({ shift });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to end shift';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
