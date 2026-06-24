import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getPendingVendorCount } from '@/lib/services/admin';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const count = await getPendingVendorCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Pending vendor count error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending vendor count' },
      { status: 500 }
    );
  }
}
