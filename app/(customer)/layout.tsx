'use client';

import { Home, Search, Package, Wallet, User } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SideNav } from '@/components/layout/side-nav';
import { SetupRedirect } from '@/components/auth/setup-redirect';
import { UserProvider } from '@/lib/hooks/use-user';
import { CartProvider } from '@/lib/contexts/cart-context';

const sideNavItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/orders', icon: Package, label: 'Orders' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/account', icon: User, label: 'Account' },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <CartProvider>
        <SetupRedirect />
        <div className="flex min-h-full">
          <SideNav items={sideNavItems} />
          <div className="flex min-h-full flex-1 flex-col">
            <main className="flex-1 pb-20 lg:pb-0">
              <div className="mx-auto w-full lg:max-w-4xl">{children}</div>
            </main>
            <BottomNav />
          </div>
        </div>
      </CartProvider>
    </UserProvider>
  );
}
