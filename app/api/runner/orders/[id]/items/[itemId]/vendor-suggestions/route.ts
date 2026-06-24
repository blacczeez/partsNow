import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getVendorSuggestionsForItem } from '@/lib/services/runner-vendors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id, itemId } = await params;

  try {
    const result = await getVendorSuggestionsForItem(auth.user.id, id, itemId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load vendor suggestions';
    const status = message.includes('not found') || message.includes('not assigned')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
