import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminRiderDetail, updateAdminRider } from '@/lib/services/admin';
import { updateAdminRiderSchema } from '@/lib/validators/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const rider = await getAdminRiderDetail(id);
    return NextResponse.json(rider);
  } catch (error) {
    console.error('Admin rider detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rider details' },
      { status: 500 }
    );
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
    const result = updateAdminRiderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const vehicleType =
      result.data.vehicle_type === '' ? undefined : result.data.vehicle_type;

    const rider = await updateAdminRider(
      id,
      { vehicle_type: vehicleType },
      auth.user.id
    );

    return NextResponse.json(rider);
  } catch (error) {
    console.error('Admin rider update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update rider' },
      { status: 500 }
    );
  }
}
