import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { activateVendor } from '@/lib/services/admin';
import { activateVendorSchema } from '@/lib/validators/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = activateVendorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await activateVendor(id, result.data, auth.user.id);
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Activate vendor error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to activate vendor';
    const status =
      message.includes('not found') || message.includes('already active') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
