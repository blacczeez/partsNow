import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getDuplicateVendorGroups } from '@/lib/services/admin-vendors';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const groups = await getDuplicateVendorGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Duplicate vendors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duplicate vendors' },
      { status: 500 }
    );
  }
}
