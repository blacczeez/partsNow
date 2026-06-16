import { NextRequest, NextResponse } from 'next/server';
import { verifyRunnerAuth } from '@/lib/utils/runner-auth';
import { getRunnerOrderDetail } from '@/lib/services/runner';
import { computeSlaTimerState } from '@/lib/utils/sla-timer';
import { markSlaBreached } from '@/lib/services/sla';
import { config } from '@/lib/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRunnerAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const order = await getRunnerOrderDetail(auth.user.id, id);

    // Detect SLA breach on fetch
    const a = order.assignment;
    if (a.sla_deadline_at && !a.sla_breached) {
      const state = computeSlaTimerState(
        a.sla_deadline_at,
        a.sla_paused_at,
        a.sla_pause_accumulated_seconds,
        a.accepted_at,
        a.sla_breached,
        config.sourcing.slaWarningAmberPercent,
        config.sourcing.slaWarningRedPercent
      );
      if (state && state.phase === 'breached') {
        markSlaBreached(a.id, order.id, a.assignee_id).catch(() => {});
      }
    }

    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
