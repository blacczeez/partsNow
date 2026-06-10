'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types/database';

/**
 * Subscribe to live updates for a single order.
 * Only mount once per orderId per page (e.g. OrderStatusLive), or channels collide.
 */
export function useRealtimeOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setOrder(data as Order);
      });

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (!cancelled && payload.new) {
            setOrder(payload.new as Order);
          }
        }
      )
      .subscribe((status) => {
        if (!cancelled) {
          setIsConnected(status === 'SUBSCRIBED');
        }
      });

    return () => {
      cancelled = true;
      setIsConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, isConnected };
}
