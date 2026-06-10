'use client';

import { Home, Clock, User } from 'lucide-react';
import { UserProvider } from '@/lib/hooks/use-user';
import { RunnerBottomNav } from '@/components/runner/runner-bottom-nav';
import { TopNav } from '@/components/layout/top-nav';

const navItems = [
  { href: '/runner/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/runner/shift', icon: Clock, label: 'Shift' },
  { href: '/runner/account', icon: User, label: 'Account' },
];

export default function RunnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <TopNav
        items={navItems}
        accountHref="/runner/account"
        roleBadge={{ label: 'Runner', className: 'bg-purple-100 text-purple-700' }}
      />
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
        <span className="text-lg font-bold text-primary">PartsNow</span>
        <span className="ml-2 rounded-pill bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          Runner
        </span>
      </header>
      <main className="flex-1 p-4 pb-20 lg:pb-4">
        <div className="mx-auto w-full lg:max-w-3xl">{children}</div>
      </main>
      <RunnerBottomNav />
    </UserProvider>
  );
}
