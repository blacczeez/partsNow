'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas, MARKETING_GUTTER_CLASS } from '@/components/layout/marketing-canvas';
import { BrandLogo } from '@/components/layout/brand-logo';
import { marketingFont } from '@/lib/fonts/marketing-font';

const NAV_LINK = '#000000';
const HEADER_HEIGHT_CLASS = 'h-[69px]';

const navItems = [
  { href: '/features', label: 'Features', match: '/features' },
  { href: '/blog', label: 'Blog', match: '/blog' },
  { href: '/#testimonials', label: 'Customer Stories' },
  { href: '/#markets', label: 'Our Markets' },
] as const;

interface MarketingNavProps {
  variant?: 'transparent' | 'solid';
}

export function MarketingNav({ variant: _variant = 'solid' }: MarketingNavProps) {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  if (mobileMenuPath !== null && mobileMenuPath !== pathname) {
    setMobileMenuPath(null);
  }
  const mobileOpen = mobileMenuPath === pathname;

  function isActive(item: (typeof navItems)[number]) {
    if (!('match' in item) || !item.match) return false;
    return pathname === item.match || pathname.startsWith(`${item.match}/`);
  }

  return (
    <>
      <header
        className={cn(
          marketingFont.className,
          'fixed inset-x-0 top-0 z-50  bg-white'
        )}
      >
        <MarketingCanvas className={`flex items-center justify-between py-3 ${MARKETING_GUTTER_CLASS}`}>
          <BrandLogo variant="color" height={32} priority />

          <nav className="hidden items-center md:flex md:gap-8">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'text-center text-[0.875rem] font-medium leading-none transition-colors hover:text-slate-700',
                    active && 'text-slate-700'
                  )}
                  style={{ color: active ? undefined : NAV_LINK }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-[0.875rem] font-medium leading-none text-[#0F172A] transition-opacity hover:opacity-80"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#3E208D] px-5 text-[0.875rem] font-medium leading-none text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            className="-mr-2 p-2 md:hidden"
            style={{ color: NAV_LINK }}
            onClick={() => setMobileMenuPath(mobileOpen ? null : pathname)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" strokeWidth={3} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={3} />
            )}
          </button>
        </MarketingCanvas>

        {mobileOpen && (
          <div className="border-t border-[#f3f4f6] bg-white md:hidden">
            <MarketingCanvas className={`pb-4 pt-2 ${MARKETING_GUTTER_CLASS}`}>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="rounded-button px-3 py-2.5 text-[0.875rem] font-medium leading-none"
                      style={{ color: active ? '#334155' : NAV_LINK }}
                      onClick={() => setMobileMenuPath(null)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="mt-3 flex flex-col gap-2 px-3">
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[0.875rem] font-medium leading-none text-[#0F172A]"
                    onClick={() => setMobileMenuPath(null)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#3E208D] text-[0.875rem] font-medium leading-none text-white"
                    onClick={() => setMobileMenuPath(null)}
                  >
                    Get started
                  </Link>
                </div>
              </nav>
            </MarketingCanvas>
          </div>
        )}
      </header>
      <div className={HEADER_HEIGHT_CLASS} aria-hidden />
    </>
  );
}
