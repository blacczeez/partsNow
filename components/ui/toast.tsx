'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-error" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
};

const backgrounds: Record<ToastType, string> = {
  success: 'bg-success-light border-success/20',
  error: 'bg-error-light border-error/20',
  warning: 'bg-warning-light border-warning/20',
  info: 'bg-info-light border-info/20',
};

// Simple toast state management
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify(listeners: typeof toastListeners) {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  notify(toastListeners);

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(toastListeners);
  }, 4000);
}

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-card border px-4 py-3 shadow-md',
            backgrounds[t.type]
          )}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm font-medium text-slate-800">{t.message}</p>
          <button
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              notify(toastListeners);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
