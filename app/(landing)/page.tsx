'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/use-user';
import { LandingPage } from '@/components/landing/landing-page';

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  // Always render the landing page immediately — no blank screen.
  // If auth resolves with a user, the effect above redirects to /dashboard.
  return <LandingPage />;
}
