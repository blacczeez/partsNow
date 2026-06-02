import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getSystemConfig, updateSystemConfig } from '@/lib/services/admin';
import { updateConfigSchema } from '@/lib/validators/admin';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const config = await getSystemConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateSystemConfig(
      result.data.key,
      result.data.value,
      auth.user.id
    );
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
