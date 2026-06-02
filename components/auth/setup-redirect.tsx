'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/use-user';

/**
 * Sends authenticated users without an app profile to /account to complete setup.
 */
export function SetupRedirect() {
  const { needsSetup, isLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !needsSetup) return;
    if (pathname.startsWith('/account')) return;

    router.replace('/account');
  }, [needsSetup, isLoading, pathname, router]);

  return null;
}
