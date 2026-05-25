'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function Header({ title, showBack, rightAction, className }: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4',
        className
      )}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className="-ml-2 mr-2 flex h-10 w-10 items-center justify-center rounded-button text-slate-600 hover:bg-slate-100"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-slate-900">{title}</h1>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
