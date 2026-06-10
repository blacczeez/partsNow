import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fieldSize?: 'sm' | 'md';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, fieldSize = 'md', children, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            disabled={disabled}
            className={cn(
              'w-full appearance-none border border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
              fieldSize === 'sm'
                ? 'h-9 rounded-button pl-3 pr-9 text-sm text-slate-700'
                : 'flex h-11 rounded-input px-3 py-2 pr-10 text-base',
              error && 'border-error focus:border-error focus:ring-error/20',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400',
              fieldSize === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
              disabled && 'opacity-50'
            )}
            aria-hidden
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
