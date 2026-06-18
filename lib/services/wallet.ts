import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { initializePayment, verifyPayment } from '@/lib/integrations/paystack';
import { config } from '@/lib/config';
import type { WalletLedgerOptions } from '@/lib/types/wallet';
import type { WalletTransactionSummary, EnrichedWalletTransaction } from '@/lib/types/wallet';
import type { WalletTransactionFilter } from '@/lib/utils/wallet-transactions';
import {
  applyWalletTransactionFilter,
  enrichWalletTransactions,
  getWalletTransactionSummary,
} from '@/lib/services/wallet-transactions-query';
import type { WalletTransaction } from '@/lib/types/database';

export async function getWalletBalance(userId: string): Promise<{
  balance: number;
  heldBalance: number;
  currency: string;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('wallets')
    .select('balance, held_balance, currency')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    balance: data.balance,
    heldBalance: data.held_balance,
    currency: data.currency,
  };
}

function ledgerMetadata(options?: WalletLedgerOptions) {
  return options?.metadata ?? {};
}

export async function getTransactions(
  userId: string,
  page: number = 1,
  limit: number = 10,
  filter: WalletTransactionFilter = 'all'
): Promise<{
  transactions: EnrichedWalletTransaction[];
  total: number;
  summary: WalletTransactionSummary;
}> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) {
    return {
      transactions: [],
      total: 0,
      summary: {
        moneyIn: 0,
        moneyOut: 0,
        periodLabel: new Date().toLocaleString('en-NG', { month: 'long', year: 'numeric' }),
        filter,
      },
    };
  }

  const filteredQuery = applyWalletTransactionFilter(
    supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id),
    filter
  );

  const { data, error, count } = await filteredQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const transactions = await enrichWalletTransactions(supabase, (data || []) as WalletTransaction[]);
  const summary = await getWalletTransactionSummary(supabase, wallet.id, filter);

  return {
    transactions,
    total: count || 0,
    summary,
  };
}

export async function initiateTopUp(
  userId: string,
  amount: number
): Promise<{ authorizationUrl: string; reference: string }> {
  const supabase = await createClient();

  // Get user email for Paystack
  const { data: user } = await supabase
    .from('users')
    .select('email, phone')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  const email = user.email || `${user.phone}@partsdey.ng`;
  const reference = `topup_${userId}_${Date.now()}`;

  const result = await initializePayment({
    email,
    amount,
    reference,
    callbackUrl: `${config.app.url}/wallet?reference=${reference}`,
    metadata: {
      type: 'wallet_topup',
      user_id: userId,
    },
  });

  return {
    authorizationUrl: result.authorizationUrl,
    reference: result.reference,
  };
}

export async function verifyAndCreditTopUp(
  userId: string,
  reference: string
): Promise<{ success: boolean; amount?: number; newBalance?: number }> {
  const supabase = await createClient();

  // Check if already processed
  const { data: existing } = await supabase
    .from('payment_events')
    .select('id')
    .eq('provider_reference', reference)
    .eq('status', 'success')
    .single();

  if (existing) {
    // Already processed, return current balance
    const balance = await getWalletBalance(userId);
    return { success: true, amount: 0, newBalance: balance?.balance };
  }

  // Verify with Paystack
  const payment = await verifyPayment(reference);

  if (payment.status !== 'success') {
    return { success: false };
  }

  // Get wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) throw new Error('Wallet not found');

  // Credit wallet via RPC
  await supabase.rpc('credit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: payment.amount,
    p_reference: reference,
    p_description: 'Wallet top-up via Paystack',
    p_metadata: { kind: 'topup', source: 'paystack' },
  });

  // Log payment event
  await supabase.from('payment_events').insert({
    wallet_id: wallet.id,
    type: 'charge_succeeded',
    amount: payment.amount,
    provider: 'paystack',
    provider_reference: reference,
    status: 'success',
  });

  const newBalance = await getWalletBalance(userId);
  return {
    success: true,
    amount: payment.amount,
    newBalance: newBalance?.balance,
  };
}

export async function debitWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
  options?: WalletLedgerOptions
): Promise<boolean> {
  const supabase = await createClient();

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const { data: success, error } = await supabase.rpc('debit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: amount,
    p_reference: reference,
    p_description: description,
    p_metadata: ledgerMetadata(options),
  });

  if (error) {
    throw new Error(error.message);
  }

  return success === true;
}

export async function creditWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
  options?: WalletLedgerOptions
): Promise<boolean> {
  const supabase = await createClient();

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!wallet) return false;

  const { data: success } = await supabase.rpc('credit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: amount,
    p_reference: reference,
    p_description: description,
    p_metadata: ledgerMetadata(options),
  });

  return success === true;
}

/** Service-role wallet credit for refunds/settlement (no admin session required). */
export async function creditWalletAsService(
  userId: string,
  amount: number,
  reference: string,
  description: string,
  options?: WalletLedgerOptions
): Promise<void> {
  const supabase = createServiceClient();

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (walletError || !wallet) {
    throw new Error('Customer wallet not found — cannot process refund');
  }

  const { data: success, error: rpcError } = await supabase.rpc('credit_wallet', {
    p_wallet_id: wallet.id,
    p_amount: amount,
    p_reference: reference,
    p_description: description,
    p_metadata: ledgerMetadata(options),
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }
  if (success !== true) {
    throw new Error('Wallet credit was rejected');
  }
}
