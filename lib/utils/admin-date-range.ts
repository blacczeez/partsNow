import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
} from 'date-fns';

export type AdminDatePreset =
  | 'today'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'allTime'
  | 'custom';

export interface AdminDateRangeValue {
  preset: AdminDatePreset;
  from: string;
  to: string;
}

export interface AdminDateRangeParams {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  /** Legacy single-day query param */
  date?: string | null;
}

export interface ParsedAdminDateRange {
  preset: AdminDatePreset;
  allTime: boolean;
  from: Date | null;
  to: Date | null;
  fromIso: string | null;
  toIso: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function localStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function localEndOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isValidIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

function normalizeCustomRange(fromIso: string, toIso: string): { from: Date; to: Date } {
  let from = localStartOfDay(parseIsoDateLocal(fromIso));
  let to = localEndOfDay(parseIsoDateLocal(toIso));
  if (from.getTime() > to.getTime()) {
    [from, to] = [localStartOfDay(parseIsoDateLocal(toIso)), localEndOfDay(parseIsoDateLocal(fromIso))];
  }
  return { from, to };
}

export function getDefaultAdminDateRange(preset: AdminDatePreset = 'last7'): AdminDateRangeValue {
  const today = toIsoDate(new Date());
  if (preset === 'today') {
    return { preset: 'today', from: today, to: today };
  }
  if (preset === 'thisMonth') {
    return { preset: 'thisMonth', from: toIsoDate(startOfMonth(new Date())), to: today };
  }
  if (preset === 'allTime') {
    return { preset: 'allTime', from: '', to: '' };
  }
  if (preset === 'last30') {
    return { preset: 'last30', from: toIsoDate(subDays(new Date(), 29)), to: today };
  }
  return { preset: 'last7', from: toIsoDate(subDays(new Date(), 6)), to: today };
}

export function parseAdminDateRange(params: AdminDateRangeParams): ParsedAdminDateRange {
  if (isValidIsoDate(params.date) && !params.from && !params.to) {
    const day = parseIsoDateLocal(params.date);
    return {
      preset: 'custom',
      allTime: false,
      from: localStartOfDay(day),
      to: localEndOfDay(day),
      fromIso: params.date,
      toIso: params.date,
    };
  }

  const preset = (params.preset ?? 'last7') as AdminDatePreset;
  const now = new Date();

  if (preset === 'allTime') {
    return {
      preset,
      allTime: true,
      from: null,
      to: null,
      fromIso: null,
      toIso: null,
    };
  }

  if (preset === 'custom') {
    const fromIso = isValidIsoDate(params.from)
      ? params.from
      : isValidIsoDate(params.to)
        ? params.to
        : toIsoDate(now);
    const toIso = isValidIsoDate(params.to)
      ? params.to
      : isValidIsoDate(params.from)
        ? params.from
        : toIsoDate(now);
    const { from, to } = normalizeCustomRange(fromIso, toIso);
    return {
      preset,
      allTime: false,
      from,
      to,
      fromIso: toIsoDate(from),
      toIso: toIsoDate(to),
    };
  }

  if (preset === 'today') {
    const day = localStartOfDay(now);
    const iso = toIsoDate(day);
    return {
      preset,
      allTime: false,
      from: day,
      to: localEndOfDay(day),
      fromIso: iso,
      toIso: iso,
    };
  }

  if (preset === 'last7') {
    const from = localStartOfDay(subDays(now, 6));
    const to = localEndOfDay(now);
    return {
      preset,
      allTime: false,
      from,
      to,
      fromIso: toIsoDate(from),
      toIso: toIsoDate(to),
    };
  }

  if (preset === 'last30') {
    const from = localStartOfDay(subDays(now, 29));
    const to = localEndOfDay(now);
    return {
      preset,
      allTime: false,
      from,
      to,
      fromIso: toIsoDate(from),
      toIso: toIsoDate(to),
    };
  }

  const from = localStartOfDay(startOfMonth(now));
  const to = localEndOfDay(now);
  return {
    preset: 'thisMonth',
    allTime: false,
    from,
    to,
    toIso: toIsoDate(to),
    fromIso: toIsoDate(from),
  };
}

export function adminDateRangeToSearchParams(value: AdminDateRangeValue): URLSearchParams {
  const params = new URLSearchParams();
  params.set('preset', value.preset);
  if (value.preset === 'custom') {
    params.set('from', value.from);
    params.set('to', value.to);
  }
  return params;
}

export function formatAdminDateRangeLabel(range: ParsedAdminDateRange): string {
  if (range.allTime) return 'All time';
  if (!range.fromIso || !range.toIso) return 'Custom range';
  if (range.fromIso === range.toIso) {
    return format(parseIsoDateLocal(range.fromIso), 'd MMM yyyy');
  }
  return `${format(parseIsoDateLocal(range.fromIso), 'd MMM yyyy')} – ${format(parseIsoDateLocal(range.toIso), 'd MMM yyyy')}`;
}
