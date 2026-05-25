'use client';

import { useContext } from 'react';
import { CartContext } from '@/lib/contexts/cart-context';

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
