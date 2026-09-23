'use client';

import { AppFontShell } from '@/components/layout/app-font-shell';
import { UserProvider } from '@/lib/hooks/use-user';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFontShell className="min-h-screen">
      <UserProvider>
        {children}
      </UserProvider>
    </AppFontShell>
  );
}
