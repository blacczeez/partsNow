'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const FROM_PATHS: Record<string, string> = {
  cart: '/cart',
  checkout: '/checkout',
  loyalty: '/account/loyalty',
  orders: '/orders',
};

interface PageBackButtonProps {
  /** Used when there is no `from` / `returnTo` query param (e.g. direct visit). */
  fallbackHref: string;
}

export function PageBackButton({ fallbackHref }: PageBackButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const returnTo = searchParams.get('returnTo');

  function handleBack() {
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
      router.push(returnTo);
      return;
    }
    if (from && FROM_PATHS[from]) {
      router.push(FROM_PATHS[from]);
      return;
    }
    router.back();
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="rounded-button p-1 hover:bg-slate-100"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 text-slate-600" />
    </button>
  );
}
