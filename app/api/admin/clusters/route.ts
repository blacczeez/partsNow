import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { createCluster, getAdminClusters } from '@/lib/services/admin';
import { createClusterSchema } from '@/lib/validators/admin';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const clusters = await getAdminClusters();
    return NextResponse.json({ clusters });
  } catch (error) {
    console.error('List clusters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = createClusterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const cluster = await createCluster(result.data, auth.user.id);
    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    console.error('Create cluster error:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
