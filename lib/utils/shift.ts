export function formatShiftDuration(
  startedAt: string,
  endedAt: string | null
): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function shiftDurationMinutes(
  startedAt: string,
  endedAt: string | null
): number {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function formatShiftDateRange(
  startedAt: string,
  endedAt: string | null
): string {
  const start = new Date(startedAt);
  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  };
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  const datePart = start.toLocaleDateString('en-NG', dateFmt);
  const startTime = start.toLocaleTimeString('en-NG', timeFmt);

  if (!endedAt) {
    return `${datePart} · ${startTime} – now`;
  }

  const end = new Date(endedAt);
  const endTime = end.toLocaleTimeString('en-NG', timeFmt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${datePart} · ${startTime} – ${endTime}`;
  }

  const endDatePart = end.toLocaleDateString('en-NG', dateFmt);
  return `${datePart} ${startTime} – ${endDatePart} ${endTime}`;
}
