'use client';

import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VehicleSelect } from '@/components/forms/vehicle-select';
import { useCart } from '@/lib/hooks/use-cart';
import { formatCurrency } from '@/lib/utils/format';

export default function CartPage() {
  const { items, vehicleId, itemCount, subtotal, updateQuantity, removeItem, setVehicle } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20">
        <ShoppingCart className="h-16 w-16 text-slate-300" />
        <p className="text-lg font-medium text-slate-500">Your cart is empty</p>
        <p className="text-sm text-slate-400">Browse parts and add them to your cart</p>
        <Link href="/search">
          <Button>Browse Parts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 lg:top-[6.5rem]">
        <h1 className="text-lg font-semibold text-slate-900">
          Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})
        </h1>
      </div>

      {/* Vehicle Selection */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Vehicle</p>
        <VehicleSelect
          selectedId={vehicleId}
          onSelect={(v) => setVehicle(v?.id)}
        />
      </div>

      {/* Items List */}
      <div className="space-y-2 p-4">
        {items.map((item) => (
          <div
            key={item.partId}
            className="rounded-card border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.name}
                </p>
                <Badge variant="default" className="mt-1">
                  {item.category}
                </Badge>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(item.price)}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.partId)}
                className="ml-2 rounded-button p-1.5 text-slate-400 hover:bg-red-50 hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Quantity Controls */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.partId, item.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium text-slate-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.partId, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="font-semibold text-slate-900">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:bottom-0 lg:left-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-500">Subtotal</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <Link href="/checkout">
          <Button fullWidth>
            Proceed to Checkout
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
