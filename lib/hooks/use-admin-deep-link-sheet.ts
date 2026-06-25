'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Opens a sheet from either local selection or a `?param=` deep link.
 * Dismiss clears local state, marks the deep link handled, and strips the param from the URL.
 */
export function useAdminDeepLinkSheet(paramKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const deepLinkId = searchParams.get(paramKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const [prevDeepLinkId, setPrevDeepLinkId] = useState(deepLinkId);
  if (deepLinkId !== prevDeepLinkId) {
    setPrevDeepLinkId(deepLinkId);
    setDismissedId(null);
  }

  const activeDeepLinkId =
    deepLinkId && deepLinkId !== dismissedId ? deepLinkId : null;

  const activeId = selectedId ?? activeDeepLinkId;

  const open = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const dismiss = useCallback(() => {
    const idFromUrl = searchParams.get(paramKey);
    setSelectedId(null);

    if (idFromUrl) {
      setDismissedId(idFromUrl);
      const params = new URLSearchParams(searchParams.toString());
      params.delete(paramKey);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [paramKey, pathname, router, searchParams]);

  return {
    activeId,
    deepLinkId: activeDeepLinkId,
    open,
    dismiss,
  };
}
