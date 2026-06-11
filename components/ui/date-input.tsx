'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DateInputProps {
  label?: string;
  error?: string;
  /** ISO date string YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  fieldSize?: 'sm' | 'md';
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function isDateDisabled(date: Date, min?: string, max?: string): boolean {
  const day = startOfDay(date);
  const minDate = min ? parseDateValue(min) : null;
  const maxDate = max ? parseDateValue(max) : null;
  if (minDate && isBefore(day, startOfDay(minDate))) return true;
  if (maxDate && isAfter(day, startOfDay(maxDate))) return true;
  return false;
}

export function DateInput({
  label,
  error,
  value,
  onChange,
  id: idProp,
  fieldSize = 'md',
  min,
  max,
  disabled,
  className,
  placeholder = 'Select date',
}: DateInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectedDate = parseDateValue(value);
  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewMonth(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectDate = useCallback(
    (date: Date) => {
      if (isDateDisabled(date, min, max)) return;
      onChange(toIsoDate(date));
      setOpen(false);
    },
    [max, min, onChange]
  );

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const displayValue = selectedDate
    ? format(selectedDate, 'd MMM yyyy')
    : placeholder;

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex w-full items-center justify-between border border-slate-300 bg-white text-left text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
          fieldSize === 'sm'
            ? 'h-9 rounded-button px-3 text-sm'
            : 'h-11 rounded-input px-3 text-base',
          error && 'border-error focus:border-error focus:ring-error/20',
          !selectedDate && 'text-slate-400'
        )}
      >
        <span className="truncate">{displayValue}</span>
        <Calendar
          className={cn(
            'shrink-0 text-slate-400',
            fieldSize === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 top-full z-50 mt-1.5 w-[min(100%,18rem)] rounded-card border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-button text-slate-600 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-button text-slate-600 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-xs font-medium text-slate-400"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const today = isToday(day);
              const dayDisabled = isDateDisabled(day, min, max);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => selectDate(day)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-button text-sm transition-colors',
                    !inMonth && 'text-slate-300',
                    inMonth && !selected && !dayDisabled && 'text-slate-700 hover:bg-slate-100',
                    selected && 'bg-primary font-medium text-white hover:bg-primary-dark',
                    today && !selected && 'font-semibold text-primary ring-1 ring-primary/30',
                    dayDisabled && 'cursor-not-allowed opacity-30'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              disabled={isDateDisabled(new Date(), min, max)}
              className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
