import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getPartVendors } from '@/lib/services/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await getPartVendors(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Part vendors error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
    const status = message === 'Part not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
