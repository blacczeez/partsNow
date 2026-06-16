import { GET } from '@/app/api/cron/scheduled/route';
import { runScheduledJobs } from '@/lib/services/scheduled-jobs';
import { isAuthorizedCronRequest } from '@/lib/utils/cron-auth';

vi.mock('@/lib/services/scheduled-jobs', () => ({
  runScheduledJobs: vi.fn(),
}));

vi.mock('@/lib/utils/cron-auth', () => ({
  isAuthorizedCronRequest: vi.fn(),
}));

const mockedRunScheduledJobs = vi.mocked(runScheduledJobs);
const mockedIsAuthorizedCronRequest = vi.mocked(isAuthorizedCronRequest);

describe('GET /api/cron/scheduled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when cron auth fails', async () => {
    mockedIsAuthorizedCronRequest.mockReturnValue(false);

    const response = await GET(new Request('http://localhost/api/cron/scheduled'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockedRunScheduledJobs).not.toHaveBeenCalled();
  });

  it('runs scheduled jobs when authorized', async () => {
    mockedIsAuthorizedCronRequest.mockReturnValue(true);
    mockedRunScheduledJobs.mockResolvedValue({
      runnerAcceptTimeouts: { processed: 2, reassigned: 1, failedReassign: 0 },
      paymentHoldExpiry: { cancelled: 3 },
    });

    const response = await GET(new Request('http://localhost/api/cron/scheduled'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.runnerAcceptTimeouts.processed).toBe(2);
    expect(body.paymentHoldExpiry.cancelled).toBe(3);
  });
});
