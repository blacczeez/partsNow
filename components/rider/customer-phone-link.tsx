'use client';

import { Phone } from 'lucide-react';
import { formatPhone } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface CustomerPhoneLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

export function CustomerPhoneLink({
  phone,
  className,
  showIcon = false,
}: CustomerPhoneLinkProps) {
  if (!phone) {
    return (
      <span className={cn('text-slate-400', className)}>No phone on file</span>
    );
  }

  return (
    <a
      href={`tel:${phone}`}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-primary',
        className
      )}
    >
      {showIcon && <Phone className="h-4 w-4 shrink-0" />}
      {formatPhone(phone)}
    </a>
  );
}
