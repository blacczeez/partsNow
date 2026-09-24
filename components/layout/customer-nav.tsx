'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BrandLogo } from '@/components/layout/brand-logo';

interface CategoryItem {
  slug: string;
  name: string;
}

interface CustomerNavProps {
  cartCount?: number;
  userName?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/search', label: 'Shop' },
  { href: '/account?tab=orders', label: 'Orders' },
  { href: '/account?tab=wallet', label: 'Wallet' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export function CustomerNav({ cartCount = 0, userName }: CustomerNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnShop = pathname === '/search' || pathname.startsWith('/search');
  const urlQuery = isOnShop ? (searchParams.get('q') || '') : '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  // Sync input with URL ?q= when it changes externally (e.g. back/forward nav)
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchQuery(urlQuery);
  }

  // Fetch categories for dropdown
  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.categories) {
          setCategories(
            data.categories.map((c: { slug: string; name: string }) => ({
              slug: c.slug,
              name: c.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const updateShopQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);

    if (isOnShop) {
      // Debounce live updates on the shop page
      debounceRef.current = setTimeout(() => updateShopQuery(value), 300);
    } else if (value.trim()) {
      // Not on shop — navigate after a typing pause
      debounceRef.current = setTimeout(() => {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }, 500);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    if (isOnShop) {
      updateShopQuery(searchQuery);
    } else if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const firstName = userName?.split(' ')[0] || '';
  const initials = userName ? getInitials(userName) : '?';
  const isCategoriesActive = pathname.startsWith('/search') && pathname.includes('category');

  return (
    <div className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white lg:block">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-1">
        {/* Brand */}
        <BrandLogo variant="color" height={28} href="/dashboard" />

        {/* Nav Links */}
        <nav className="ml-16 flex items-center gap-7">
          {navItems.map((item) => {
            let isActive: boolean;
            if (item.label === 'Orders') {
              isActive =
                pathname.startsWith('/order/') ||
                (pathname === '/account' && searchParams.get('tab') === 'orders') ||
                pathname === '/orders' ||
                pathname.startsWith('/orders/');
            } else if (item.label === 'Wallet') {
              isActive =
                (pathname === '/account' && searchParams.get('tab') === 'wallet') ||
                pathname === '/wallet' ||
                pathname.startsWith('/wallet/');
            } else {
              isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + '/');
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-[0.9rem] font-medium transition-colors',
                  isActive
                    ? 'text-[#3E208D]'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Categories dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className={cn(
                'flex items-center gap-1 text-[0.9rem] font-medium transition-colors',
                isCategoriesActive
                  ? 'text-[#3E208D]'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Categories
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  categoriesOpen && 'rotate-180'
                )}
              />
            </button>

            {categoriesOpen && categories.length > 0 && (
              <div className="absolute left-0 top-full mt-3 w-52 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/search?category=${cat.slug}`}
                    className="block px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setCategoriesOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Search, Cart, User */}
        <div className="flex items-center gap-5">
          {/* Search input */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="What are you looking for"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-44 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </form>

          {/* Cart */}
          <Link
            href="/cart"
            className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className="text-sm font-medium">Cart</span>
          </Link>

          {/* User avatar + greeting */}
          <Link
            href="/account"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3E208D] text-xs font-semibold text-white">
              {initials}
            </span>
            {firstName && (
              <span className="text-sm font-medium text-slate-700">
                Hello {firstName}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
