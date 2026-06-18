'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown, Zap, ShieldCheck, Wallet, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const featureLinks = [
  { href: '/features/instant-delivery', label: '45-Minute Delivery', icon: Zap },
  { href: '/features/sourcing', label: 'Expert Sourcing', icon: ShieldCheck },
  { href: '/features/wallet', label: 'PartsDey Wallet', icon: Wallet },
  { href: '/features/tracking', label: 'Live Tracking', icon: MapPin },
  { href: '/features/loyalty', label: 'Loyalty Rewards', icon: Star },
];

interface MarketingNavProps {
  variant?: 'transparent' | 'solid';
}

export function MarketingNav({ variant = 'solid' }: MarketingNavProps) {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileOpen = mobileMenuPath === pathname;
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isTransparent = variant === 'transparent';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuPath(null);
    setMobileFeaturesOpen(false);
  }, [pathname]);

  // Close desktop dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
    }
    if (featuresOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [featuresOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        !isTransparent && 'border-b border-slate-200 bg-white'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            'text-xl font-bold',
            isTransparent ? 'text-white' : 'text-slate-900'
          )}
        >
          PartsDey
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          {/* Features dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button
              type="button"
              onClick={() => setFeaturesOpen((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 text-sm font-medium transition-colors',
                isTransparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900',
                pathname.startsWith('/features') &&
                  (isTransparent ? 'text-white' : 'text-slate-900')
              )}
            >
              Features
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  featuresOpen && 'rotate-180'
                )}
              />
            </button>

            {featuresOpen && (
              <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-2">
              <div className="rounded-card border border-slate-200 bg-white py-2 shadow-lg">
                {featureLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900',
                      pathname === href && 'bg-slate-50 text-slate-900'
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </Link>
                ))}
                <div className="mx-4 my-1.5 border-t border-slate-100" />
                <Link
                  href="/features"
                  className="block px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
                >
                  View all features
                </Link>
              </div>
              </div>
            )}
          </div>

          {/* Blog link */}
          <Link
            href="/blog"
            className={cn(
              'text-sm font-medium transition-colors',
              isTransparent
                ? 'text-white/80 hover:text-white'
                : 'text-slate-600 hover:text-slate-900',
              pathname.startsWith('/blog') &&
                (isTransparent ? 'text-white' : 'text-slate-900')
            )}
          >
            Blog
          </Link>

          <Link
            href="/login"
            className={cn(
              'rounded-button px-4 py-2 text-sm font-medium transition-colors',
              isTransparent
                ? 'text-white/80 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Login
          </Link>
          <Link
            href="/login"
            className={cn(
              'rounded-button px-4 py-2 text-sm font-medium transition-colors',
              isTransparent
                ? 'bg-white text-primary hover:bg-white/90'
                : 'bg-primary text-white hover:bg-primary-dark'
            )}
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className={cn(
            'sm:hidden p-2 -mr-2',
            isTransparent ? 'text-white' : 'text-slate-700'
          )}
          onClick={() => setMobileMenuPath(mobileOpen ? null : pathname)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className={cn(
            'sm:hidden border-t px-4 pb-4 pt-2',
            isTransparent
              ? 'border-white/20 bg-primary-dark/95 backdrop-blur-sm'
              : 'border-slate-200 bg-white'
          )}
        >
          <nav className="flex flex-col gap-1">
            {/* Features expandable section */}
            <button
              type="button"
              onClick={() => setMobileFeaturesOpen((v) => !v)}
              className={cn(
                'flex w-full items-center justify-between rounded-button px-3 py-2.5 text-sm font-medium transition-colors',
                isTransparent
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                pathname.startsWith('/features') &&
                  (isTransparent
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-50 text-slate-900')
              )}
            >
              Features
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  mobileFeaturesOpen && 'rotate-180'
                )}
              />
            </button>

            {mobileFeaturesOpen && (
              <div className="flex flex-col gap-0.5 pl-3">
                {featureLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-button px-3 py-2 text-sm transition-colors',
                      isTransparent
                        ? 'text-white/70 hover:bg-white/10 hover:text-white'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                      pathname === href &&
                        (isTransparent
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-50 text-slate-900')
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isTransparent ? 'text-white/60' : 'text-primary')} />
                    {label}
                  </Link>
                ))}
                <Link
                  href="/features"
                  className={cn(
                    'rounded-button px-3 py-2 text-sm font-medium transition-colors',
                    isTransparent
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : 'text-primary hover:bg-slate-50'
                  )}
                >
                  View all features
                </Link>
              </div>
            )}

            {/* Blog */}
            <Link
              href="/blog"
              className={cn(
                'rounded-button px-3 py-2.5 text-sm font-medium transition-colors',
                isTransparent
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                pathname.startsWith('/blog') &&
                  (isTransparent
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-50 text-slate-900')
              )}
            >
              Blog
            </Link>

            <Link
              href="/login"
              className={cn(
                'rounded-button px-3 py-2.5 text-sm font-medium transition-colors',
                isTransparent
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              Login
            </Link>
            <Link
              href="/login"
              className={cn(
                'mt-1 rounded-button px-3 py-2.5 text-center text-sm font-medium transition-colors',
                isTransparent
                  ? 'bg-white text-primary hover:bg-white/90'
                  : 'bg-primary text-white hover:bg-primary-dark'
              )}
            >
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
