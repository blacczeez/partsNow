'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  closeOnBackdropClick = true,
}: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end lg:items-center lg:justify-center lg:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <button
        type="button"
        aria-label={closeOnBackdropClick ? 'Close dialog' : 'Dismiss dialog blocked'}
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 flex w-full max-h-[min(90dvh,100%)] flex-col rounded-t-2xl bg-white shadow-xl',
          'lg:max-h-[85vh] lg:max-w-lg lg:rounded-card',
          className
        )}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-button p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 scrollbar-subtle">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : (
          <div className="shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4" />
        )}
      </div>
    </div>
  );
}
