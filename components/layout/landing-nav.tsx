'use client';

import Link from 'next/link';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-primary">
          PartsNow
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-button px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
