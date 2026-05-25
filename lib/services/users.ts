import { createClient } from '@/lib/supabase/server';
import type { User, Wallet } from '@/lib/types/database';

export interface UserProfile extends User {
  wallet: Wallet | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) return null;

  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { ...user, wallet: wallet ?? null };
}

export async function createUserProfile(input: {
  id: string;
  phone: string;
  full_name: string;
  email?: string;
  delivery_address?: string;
}): Promise<User> {
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      id: input.id,
      phone: input.phone,
      full_name: input.full_name,
      email: input.email || null,
      user_type: 'car_owner' as const,
      profile: input.delivery_address
        ? { delivery_address: input.delivery_address }
        : {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-create wallet
  await getOrCreateWallet(user.id);

  return user;
}

export async function updateUserProfile(
  userId: string,
  input: { full_name?: string; email?: string; profile?: Record<string, unknown> }
): Promise<User> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.full_name !== undefined) updates.full_name = input.full_name;
  if (input.email !== undefined) updates.email = input.email || null;
  if (input.profile !== undefined) updates.profile = input.profile;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing;

  const { data: wallet, error } = await supabase
    .from('wallets')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return wallet;
}
