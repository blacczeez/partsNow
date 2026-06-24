import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { updateVendor } from '@/lib/services/admin';
import { getAdminVendorDetail } from '@/lib/services/admin-vendors';
import { updateVendorSchema } from '@/lib/validators/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const detail = await getAdminVendorDetail(id);
    if (!detail) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error('Admin vendor detail error:', err);
    return NextResponse.json({ error: 'Failed to load vendor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateVendorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await updateVendor(id, result.data, auth.user.id);
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Update vendor error:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}
