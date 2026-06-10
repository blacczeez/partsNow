'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Logout failed');
      }
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return { logout, isLoggingOut };
}
