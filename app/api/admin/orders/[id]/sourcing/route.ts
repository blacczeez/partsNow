import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { adminSourcingActionSchema } from '@/lib/validators/admin-sourcing';
import {
  adminMessageCustomerAboutSourcing,
  dismissSourcingEscalation,
  retryRunnerAutoAssign,
} from '@/lib/services/admin-sourcing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = adminSourcingActionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    switch (result.data.action) {
      case 'retry_assign': {
        const { assigned } = await retryRunnerAutoAssign(id, auth.user.id);
        return NextResponse.json({ assigned });
      }
      case 'message_customer': {
        await adminMessageCustomerAboutSourcing(
          id,
          result.data.message,
          auth.user.id
        );
        return NextResponse.json({ success: true });
      }
      case 'dismiss': {
        await dismissSourcingEscalation(id, auth.user.id, result.data.note);
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin sourcing action error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to process sourcing action';
    const status =
      message.includes('not found') ||
      message.includes('Cannot') ||
      message.includes('required') ||
      message.includes('unavailable')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
