'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MobileCustomerHeaderProps {
  cartCount?: number;
}

export function MobileCustomerHeader({ cartCount = 0 }: MobileCustomerHeaderProps) {
  const pathname = usePathname();
  const isCartPage = pathname === '/cart';

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
      <Link href="/" className="text-base font-bold text-primary">
        PartsDey
      </Link>
      <Link
        href="/cart"
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
        className={cn(
          'relative rounded-button p-2 transition-colors',
          isCartPage ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <ShoppingCart className="h-5 w-5" />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>
    </header>
  );
}
