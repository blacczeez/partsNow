import { NextRequest, NextResponse } from 'next/server';
import { getPartById } from '@/lib/services/inventory';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const part = await getPartById(id);

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    return NextResponse.json({ part });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch part';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
