import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/whatsapp';
import { formatCurrency } from '@/lib/utils/format';
import { config } from '@/lib/config';
import { initializePayment } from '@/lib/integrations/paystack';
import type { User } from '@/lib/types/database';

export async function handleWallet(
  phone: string,
  text: string,
  user: User
): Promise<void> {
  const lowerText = text.toLowerCase().trim();

  if (lowerText === 'balance' || lowerText === 'wallet') {
    await showBalance(phone, user);
    return;
  }

  if (lowerText === 'topup' || lowerText === 'top up' || lowerText.startsWith('topup ')) {
    // Check if amount specified
    const match = lowerText.match(/(?:topup|top up)\s+(\d+)/);
    const amount = match ? parseInt(match[1], 10) : 5000;
    await initiateTopUp(phone, user, amount);
    return;
  }
}

async function showBalance(phone: string, user: User): Promise<void> {
  const supabase = createServiceClient();

  const { data: rawWallet } = await supabase
    .from('wallets')
    .select('balance, held_balance')
    .eq('user_id', user.id)
    .single();

  const wallet = rawWallet as { balance: number; held_balance: number } | null;

  if (!wallet) {
    await sendTextMessage(phone, 'Your wallet has not been set up yet. Please contact support.');
    return;
  }

  let message = `Wallet Balance: ${formatCurrency(wallet.balance)}`;
  if (wallet.held_balance > 0) {
    message += `\nHeld: ${formatCurrency(wallet.held_balance)}`;
  }
  message += '\n\nTo top up, type "topup" followed by the amount (e.g., "topup 10000").';

  await sendTextMessage(phone, message);
}

async function initiateTopUp(phone: string, user: User, amount: number): Promise<void> {
  if (amount < 5000) {
    await sendTextMessage(phone, `Minimum top-up is ${formatCurrency(5000)}. Please try again.`);
    return;
  }

  if (amount > 500000) {
    await sendTextMessage(phone, `Maximum top-up is ${formatCurrency(500000)}. Please try again.`);
    return;
  }

  try {
    const email = user.email || `${user.phone}@partsdey.ng`;
    const reference = `topup_${user.id}_${Date.now()}`;

    const result = await initializePayment({
      email,
      amount,
      reference,
      callbackUrl: `${config.app.url}/wallet?reference=${reference}`,
      metadata: {
        type: 'wallet_topup',
        user_id: user.id,
      },
    });

    await sendTextMessage(
      phone,
      `Top up ${formatCurrency(amount)} to your wallet:\n\n${result.authorizationUrl}\n\nThis link expires in 30 minutes.`
    );
  } catch (error) {
    console.error('WhatsApp top-up error:', error);
    await sendTextMessage(
      phone,
      'Sorry, we could not generate a payment link. Please try again later.'
    );
  }
}

export function isWalletCommand(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower === 'balance' ||
    lower === 'wallet' ||
    lower === 'topup' ||
    lower === 'top up' ||
    lower.startsWith('topup ')
  );
}
