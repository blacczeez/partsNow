'use client';

import { useState, useEffect } from 'react';
import type { OrderWithItems } from '@/lib/types/database';

export function useRecentOrders(limit = 3) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await globalThis.fetch(`/api/orders?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, [limit]);

  return { orders, isLoading };
}
