'use client';

import { Home, Search, Package, Wallet, User } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopNav } from '@/components/layout/top-nav';
import { SetupRedirect } from '@/components/auth/setup-redirect';
import { UserProvider, useUser } from '@/lib/hooks/use-user';
import { CartProvider } from '@/lib/contexts/cart-context';
import { useCart } from '@/lib/hooks/use-cart';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/orders', icon: Package, label: 'Orders' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/account', icon: User, label: 'Account' },
];

function CustomerTopNav() {
  const { wallet } = useUser();
  const { itemCount } = useCart();

  return (
    <TopNav
      items={navItems}
      showSearch
      showCartBadge
      showWalletBadge
      cartCount={itemCount}
      walletBalance={wallet?.balance ?? 0}
    />
  );
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <CartProvider>
        <SetupRedirect />
        <CustomerTopNav />
        <main className="min-h-full flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full lg:max-w-4xl">{children}</div>
        </main>
        <BottomNav />
      </CartProvider>
    </UserProvider>
  );
}
