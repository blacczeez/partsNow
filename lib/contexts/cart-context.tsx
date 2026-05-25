'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem } from '@/lib/types/cart';

const STORAGE_KEY = 'partsnow-cart';

interface CartContextValue {
  items: CartItem[];
  vehicleId: string | undefined;
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (partId: string, quantity: number) => void;
  removeItem: (partId: string) => void;
  setVehicle: (vehicleId: string | undefined) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadCart(): { items: CartItem[]; vehicleId?: string } {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      vehicleId: parsed.vehicleId,
    };
  } catch {
    return { items: [] };
  }
}

function saveCart(items: CartItem[], vehicleId?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, vehicleId }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [vehicleId, setVehicleId] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadCart();
    setItems(saved.items);
    setVehicleId(saved.vehicleId);
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) {
      saveCart(items, vehicleId);
    }
  }, [items, vehicleId, mounted]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.partId === item.partId);
        if (existing) {
          return prev.map((i) =>
            i.partId === item.partId
              ? { ...i, quantity: i.quantity + (item.quantity || 1) }
              : i
          );
        }
        return [...prev, { ...item, quantity: item.quantity || 1 }];
      });
    },
    []
  );

  const updateQuantity = useCallback((partId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.partId !== partId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.partId === partId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const removeItem = useCallback((partId: string) => {
    setItems((prev) => prev.filter((i) => i.partId !== partId));
  }, []);

  const setVehicle = useCallback((id: string | undefined) => {
    setVehicleId(id);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setVehicleId(undefined);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        vehicleId,
        itemCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        setVehicle,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
