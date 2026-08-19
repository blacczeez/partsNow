import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Landing / marketing content width. Change this once to update every section. */
export const MARKETING_MAX_WIDTH_CLASS = 'max-w-[1520px]';

/** Vertical rhythm for marketing sections. Prefer padding over fixed heights. */
export const MARKETING_SECTION_SPACE = 'py-16 lg:py-24';

/** Display type. Mobile-first sizes; larger screens pick up the sm/lg steps. */
export const marketingType = {
  hero: 'text-[26px] leading-8 sm:text-5xl sm:leading-[1.1] lg:text-[64px] lg:leading-[69px]',
  section: 'text-2xl leading-8 sm:text-[36px] sm:leading-[44px]',
  cta: 'text-[28px] leading-8 sm:text-[60px] sm:leading-[60px]',
  brand: 'text-[28px] leading-8 sm:text-[38px] sm:leading-[46px]',
} as const;

export function MarketingCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full', MARKETING_MAX_WIDTH_CLASS, className)}>
      {children}
    </div>
  );
}
