import { config } from '@/lib/config';
import { isAuthorizedCronRequest } from '@/lib/utils/cron-auth';

describe('isAuthorizedCronRequest', () => {
  const originalSecret = process.env.CRON_SECRET;
  const originalEnv = config.app.env;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
    (config.app as { env: string }).env = originalEnv;
  });

  it('allows requests in development when CRON_SECRET is unset', () => {
    delete process.env.CRON_SECRET;
    (config.app as { env: string }).env = 'development';

    expect(
      isAuthorizedCronRequest(
        new Request('http://localhost/api/cron/scheduled')
      )
    ).toBe(true);
  });

  it('rejects requests without bearer token when CRON_SECRET is set', () => {
    process.env.CRON_SECRET = 'test-secret';

    expect(
      isAuthorizedCronRequest(
        new Request('http://localhost/api/cron/scheduled')
      )
    ).toBe(false);
  });

  it('accepts matching bearer token', () => {
    process.env.CRON_SECRET = 'test-secret';

    expect(
      isAuthorizedCronRequest(
        new Request('http://localhost/api/cron/scheduled', {
          headers: { authorization: 'Bearer test-secret' },
        })
      )
    ).toBe(true);
  });
});
