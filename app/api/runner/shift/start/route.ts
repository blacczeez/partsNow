import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { startShift } from '@/lib/services/runner';
import { startShiftSchema } from '@/lib/validators/runner';

export async function POST(request: NextRequest) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const result = startShiftSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.format() },
      { status: 400 }
    );
  }

  try {
    const shift = await startShift(auth.user.id, result.data.latitude, result.data.longitude);
    return NextResponse.json({ shift }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start shift';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
