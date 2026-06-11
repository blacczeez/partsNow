import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { adminMarkPartsReturned } from '@/lib/services/admin';

const bodySchema = z.object({
  partsRecoveryPercent: z.number().min(0).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    const partsRecoveryRate =
      parsed.success && parsed.data.partsRecoveryPercent !== undefined
        ? parsed.data.partsRecoveryPercent / 100
        : undefined;

    await adminMarkPartsReturned(id, partsRecoveryRate, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to mark parts returned';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
