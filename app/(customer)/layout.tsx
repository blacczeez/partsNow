import { BottomNav } from '@/components/layout/bottom-nav';
import { UserProvider } from '@/lib/hooks/use-user';
import { CartProvider } from '@/lib/contexts/cart-context';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <CartProvider>
        <div className="flex min-h-full flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </div>
      </CartProvider>
    </UserProvider>
  );
}
