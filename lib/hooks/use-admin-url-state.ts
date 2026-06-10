'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useAdminUrlState(keys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = searchParams.get(key) ?? '';
    }
    result.page = searchParams.get('page') ?? '1';
    return result;
  }, [keys, searchParams]);

  const setUrlState = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else if (key === 'page' && String(value) === '1') {
          params.delete('page');
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { values, setUrlState };
}
