'use client';

import { Home, Clock, User } from 'lucide-react';
import { UserProvider } from '@/lib/hooks/use-user';
import { RiderBottomNav } from '@/components/rider/rider-bottom-nav';
import { SideNav } from '@/components/layout/side-nav';

const sideNavItems = [
  { href: '/rider/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/rider/history', icon: Clock, label: 'History' },
  { href: '/account', icon: User, label: 'Account' },
];

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="flex min-h-full">
        <SideNav
          items={sideNavItems}
          brandLabel="Rider"
          brandColor="bg-green-100 text-green-700"
        />
        <div className="flex min-h-full flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
            <span className="text-lg font-bold text-primary">PartsNow</span>
            <span className="ml-2 rounded-pill bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Rider
            </span>
          </header>
          <main className="flex-1 p-4 pb-20 lg:pb-4">
            <div className="mx-auto w-full lg:max-w-3xl">{children}</div>
          </main>
          <RiderBottomNav />
        </div>
      </div>
    </UserProvider>
  );
}
