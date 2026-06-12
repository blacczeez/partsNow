import type { WalletTransaction, WalletTransactionType } from '@/lib/types/database';
import type { WalletTransactionKind } from '@/lib/types/wallet';
import type { WalletTransactionCategory } from '@/lib/utils/wallet-transactions';

const VALID_KINDS = new Set<WalletTransactionKind>([
  'topup',
  'order_payment',
  'refund',
  'partial_refund',
  'price_adjustment',
  'hold',
  'release',
  'other',
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function descIncludes(tx: WalletTransaction, needle: string): boolean {
  return (tx.description ?? '').toLowerCase().includes(needle);
}

function inferKindFromLegacyFields(tx: WalletTransaction): WalletTransactionKind {
  const desc = (tx.description ?? '').toLowerCase();
  const ref = (tx.reference ?? '').toLowerCase();

  if (tx.type === 'hold') return 'hold';
  if (tx.type === 'release') return 'release';

  if (desc.includes('top-up') || desc.includes('topup') || ref.startsWith('topup_')) {
    return 'topup';
  }

  if (desc.includes('refund') || ref.startsWith('refund_') || ref.startsWith('partial_refund_')) {
    return descIncludes(tx, 'partial refund') ? 'partial_refund' : 'refund';
  }

  if (tx.type === 'debit' && (desc.includes('order') || UUID_REGEX.test(tx.reference ?? ''))) {
    return 'order_payment';
  }

  if (descIncludes(tx, 'price adjustment')) return 'price_adjustment';

  return 'other';
}

export function resolveWalletTransactionKind(tx: WalletTransaction): WalletTransactionKind {
  const rawKind = tx.metadata?.kind;
  if (typeof rawKind === 'string' && VALID_KINDS.has(rawKind as WalletTransactionKind)) {
    return rawKind as WalletTransactionKind;
  }

  return inferKindFromLegacyFields(tx);
}

export function walletKindToCategory(kind: WalletTransactionKind): WalletTransactionCategory {
  switch (kind) {
    case 'topup':
      return 'topup';
    case 'order_payment':
    case 'price_adjustment':
      return 'order';
    case 'refund':
    case 'partial_refund':
      return 'refund';
    case 'hold':
    case 'release':
      return 'hold';
    default:
      return 'other';
  }
}

export function isWalletInflowType(type: WalletTransactionType): boolean {
  return type === 'credit' || type === 'release';
}
