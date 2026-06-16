import { NextResponse } from 'next/server';
import { runScheduledJobs } from '@/lib/services/scheduled-jobs';
import { isAuthorizedCronRequest } from '@/lib/utils/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScheduledJobs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Scheduled jobs failed:', error);
    return NextResponse.json(
      { error: 'Scheduled jobs failed' },
      { status: 500 }
    );
  }
}
