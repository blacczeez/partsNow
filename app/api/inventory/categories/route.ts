import { NextResponse } from 'next/server';
import { getPartCategoriesWithCounts } from '@/lib/services/part-categories';

export async function GET() {
  try {
    const categories = await getPartCategoriesWithCounts();
    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch categories';
    const isNetworkError =
      message.includes('fetch failed') ||
      message.includes('ENOTFOUND') ||
      message.includes('ECONNREFUSED');

    if (isNetworkError) {
      console.error('Categories API: cannot reach Supabase — check NEXT_PUBLIC_SUPABASE_URL and network');
    }

    return NextResponse.json(
      {
        error: isNetworkError
          ? 'Cannot reach database. Check your internet connection and Supabase URL in .env.local, then restart the dev server.'
          : message,
      },
      { status: isNetworkError ? 503 : 500 }
    );
  }
}
