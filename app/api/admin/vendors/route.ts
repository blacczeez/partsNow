import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminVendors, createVendor } from '@/lib/services/admin';
import { createVendorSchema } from '@/lib/validators/admin';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const clusterId = searchParams.get('clusterId') || undefined;
    const verification = searchParams.get('verification') || undefined;

    const result = await getAdminVendors({
      page,
      limit,
      clusterId,
      verificationStatus:
        verification === 'pending' || verification === 'active'
          ? verification
          : undefined,
    });

    return NextResponse.json({
      vendors: result.vendors,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Admin vendors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = createVendorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const vendor = await createVendor(result.data, auth.user.id);
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
