import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { mergeVendors } from '@/lib/services/admin-vendors';
import { mergeVendorsSchema } from '@/lib/validators/admin';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = mergeVendorsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await mergeVendors(
      result.data.keepVendorId,
      result.data.mergeVendorId,
      auth.user.id
    );

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Merge vendors error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to merge vendors';
    const status = message.includes('not found') || message.includes('Cannot') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
