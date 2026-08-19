'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas } from '@/components/layout/marketing-canvas';
import { marketingFont } from '@/lib/fonts/marketing-font';

const NAV_DEFAULT = '#717171';
const NAV_ACTIVE = '#784FE5';

const navItems = [
  { href: '/features', label: 'Features', match: '/features' },
  { href: '/blog', label: 'Blog', match: '/blog' },
  { href: '/#testimonials', label: 'Customer Stories' },
  { href: '/#markets', label: 'Our Markets' },
  { href: '/#faq', label: 'FAQs' },
] as const;

interface MarketingNavProps {
  variant?: 'transparent' | 'solid';
}

export function MarketingNav({ variant = 'solid' }: MarketingNavProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  if (mobileMenuPath !== null && mobileMenuPath !== pathname) {
    setMobileMenuPath(null);
  }
  const mobileOpen = mobileMenuPath === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function isActive(item: (typeof navItems)[number]) {
    if (!('match' in item) || !item.match) return false;
    return pathname === item.match || pathname.startsWith(`${item.match}/`);
  }

  return (
    <header
      className={cn(
        marketingFont.className,
        'sticky top-0 z-50 transition-[background-color,border-color] duration-200',
        (variant === 'solid' || scrolled) && 'bg-white',
        scrolled && 'border-b border-[#E8E8E8]'
      )}
    >
      <MarketingCanvas className="flex items-center justify-between px-4 py-5 sm:px-10">
        <Link
          href="/"
          className="text-lg font-bold leading-none text-slate-900 sm:text-xl"
        >
          PartsDey
        </Link>

        <nav className="hidden items-center md:flex md:gap-8">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                className="text-center text-base leading-none transition-colors hover:text-[#784FE5]"
                style={{ color: active ? NAV_ACTIVE : NAV_DEFAULT }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/login"
          className="hidden text-base leading-none text-[#784FE5] transition-opacity hover:opacity-80 md:inline"
        >
          Get started
        </Link>

        <button
          type="button"
          className="p-2 -mr-2 md:hidden"
          style={{ color: NAV_DEFAULT }}
          onClick={() => setMobileMenuPath(mobileOpen ? null : pathname)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </MarketingCanvas>

      {mobileOpen && (
        <div
          className={cn(
            'border-t border-slate-200 px-4 pb-4 pt-2 md:hidden',
            variant === 'solid' || scrolled ? 'bg-white' : 'bg-white/95 backdrop-blur-sm'
          )}
        >
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-button px-3 py-2.5 text-base leading-none"
                  style={{ color: active ? NAV_ACTIVE : NAV_DEFAULT }}
                  onClick={() => setMobileMenuPath(null)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className="rounded-button px-3 py-2.5 text-base leading-none text-[#784FE5]"
              onClick={() => setMobileMenuPath(null)}
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
