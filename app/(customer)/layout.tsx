'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileCustomerHeader } from '@/components/layout/mobile-customer-header';
import { CustomerNav } from '@/components/layout/customer-nav';
import { SetupRedirect } from '@/components/auth/setup-redirect';
import { UserProvider, useUser } from '@/lib/hooks/use-user';
import { CartProvider } from '@/lib/contexts/cart-context';
import { SelectedVehicleProvider } from '@/lib/contexts/selected-vehicle-context';
import { useCart } from '@/lib/hooks/use-cart';
import { AppFontShell } from '@/components/layout/app-font-shell';
import { Footer } from '@/components/layout/footer';

function CustomerTopNav() {
  const { user } = useUser();
  const { itemCount } = useCart();

  return (
    <CustomerNav
      cartCount={itemCount}
      userName={user?.full_name}
    />
  );
}

function CustomerShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, needsSetup } = useUser();
  const { itemCount } = useCart();
  const router = useRouter();

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!isLoading && !user && !needsSetup) {
      router.replace('/');
    }
  }, [isLoading, user, needsSetup, router]);

  // Always render the shell so layout is stable from first paint
  return (
    <>
      {!isLoading && user && <SetupRedirect />}
      <Suspense fallback={null}>
        <CustomerTopNav />
      </Suspense>
      <MobileCustomerHeader cartCount={itemCount} />
      <main className="min-h-full flex-1 pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-7xl lg:px-1">{children}</div>
      </main>
      <Footer />
      <Suspense fallback={null}>
        <BottomNav cartCount={itemCount} />
      </Suspense>
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
