import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminNotifications } from '@/lib/services/admin-notifications';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const notifications = await getAdminNotifications(supabase);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Admin notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 }
    );
  }
}
