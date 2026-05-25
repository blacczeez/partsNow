'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/types/database';

export function useRealtimeOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const updateOrder = useCallback((payload: { new: Order }) => {
    setOrder(payload.new);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial order state
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data as Order);
      });

    // Subscribe to realtime changes
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
        updateOrder
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, updateOrder]);

  return { order, isConnected };
}
