import { config } from '@/lib/config';

/** Validates Vercel cron / manual job invocations via `Authorization: Bearer <CRON_SECRET>`. */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return config.app.env === 'development';
  }

  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}
