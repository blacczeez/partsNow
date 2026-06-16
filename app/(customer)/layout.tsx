'use client';

import { Home, Search, Package, Wallet, User } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileCustomerHeader } from '@/components/layout/mobile-customer-header';
import { TopNav } from '@/components/layout/top-nav';
import { SetupRedirect } from '@/components/auth/setup-redirect';
import { UserProvider, useUser } from '@/lib/hooks/use-user';
import { CartProvider } from '@/lib/contexts/cart-context';
import { SelectedVehicleProvider } from '@/lib/contexts/selected-vehicle-context';
import { useCart } from '@/lib/hooks/use-cart';
import { AppFontShell } from '@/components/layout/app-font-shell';

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

function CustomerShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, needsSetup } = useUser();
  const { itemCount } = useCart();

  // Loading or unauthenticated — render children bare (no app chrome).
  // The page component shows <LandingPage /> when there's no user,
  // so unauthenticated visitors never see a spinner.
  if (isLoading || (!user && !needsSetup)) {
    return <>{children}</>;
  }

  return (
    <>
      <SetupRedirect />
      <CustomerTopNav />
      <MobileCustomerHeader cartCount={itemCount} />
      <main className="min-h-full flex-1 pb-20 lg:pb-0">
        <div className="mx-auto w-full lg:max-w-5xl">{children}</div>
      </main>
      <BottomNav cartCount={itemCount} />
    </>
  );
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFontShell className="flex min-h-full flex-col">
      <UserProvider>
        <CartProvider>
          <SelectedVehicleProvider>
            <CustomerShell>{children}</CustomerShell>
          </SelectedVehicleProvider>
        </CartProvider>
      </UserProvider>
    </AppFontShell>
  );
}
