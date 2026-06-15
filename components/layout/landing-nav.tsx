'use client';

import Link from 'next/link';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-white">
          PartsNow
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-button px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-button bg-white px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-white/90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
