export interface ShiftDiscrepancyInput {
  startingFloat: number;
  totalSourced: number;
  endingFloat: number | null;
}

/**
 * Cash float mismatch at shift end.
 * expected = starting − sourced; positive discrepancy = runner has extra cash vs records.
 */
export function computeShiftDiscrepancy(input: ShiftDiscrepancyInput): number {
  if (input.endingFloat == null) return 0;

  const expectedEnding = input.startingFloat - input.totalSourced;
  return roundMoney(input.endingFloat - expectedEnding);
}

export function formatShiftDiscrepancyLabel(amount: number): string {
  if (amount === 0) return 'Balanced';
  if (amount < 0) return `Short ${formatAbsCurrency(amount)}`;
  return `Over ${formatAbsCurrency(amount)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatAbsCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export type ShiftReconciliationStatus = 'active' | 'pending' | 'reconciled';

export function getShiftReconciliationStatus(shift: {
  ended_at: string | null;
  is_reconciled: boolean;
}): ShiftReconciliationStatus {
  if (!shift.ended_at) return 'active';
  if (shift.is_reconciled) return 'reconciled';
  return 'pending';
}
