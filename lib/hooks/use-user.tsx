'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Wallet } from '@/lib/types/database';

interface UserState {
  user: User | null;
  wallet: Wallet | null;
  isLoading: boolean;
  needsSetup: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserState | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me');
      if (!res.ok) {
        if (res.status === 401) {
          setUser(null);
          setWallet(null);
          setNeedsSetup(false);
          return;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await res.json();

      if (data.needsSetup) {
        setNeedsSetup(true);
        setUser(null);
        setWallet(null);
      } else {
        setUser(data.user);
        setWallet(data.wallet);
        setNeedsSetup(false);
      }
    } catch {
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) {
              setUser(null);
              setWallet(null);
              setNeedsSetup(false);
            }
            return;
          }
          throw new Error('Failed to fetch user');
        }

        const data = await res.json();

        if (!cancelled) {
          if (data.needsSetup) {
            setNeedsSetup(true);
            setUser(null);
            setWallet(null);
          } else {
            setUser(data.user);
            setWallet(data.wallet);
            setNeedsSetup(false);
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setWallet(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`customer-wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchUser();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUser]);

  return (
    <UserContext.Provider
      value={{ user, wallet, isLoading, needsSetup, refresh: fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}
