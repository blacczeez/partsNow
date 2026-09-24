'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Package,
  ShieldCheck,
  Link2,
  Clock,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { toast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Part } from '@/lib/types/database';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const cart = useCart();

  const [part, setPart] = useState<Part | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [thumbStartIndex, setThumbStartIndex] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/inventory/parts/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load part');
        setPart(data.part);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // Build image list — parts currently have at most one image_url
  const images = part?.image_url ? [part.image_url] : [];
  const VISIBLE_THUMBS = 4;

  function addToCart() {
    if (!part) return;
    if (!part.average_price) return;
    if (!part.weight_kg || part.weight_kg <= 0) {
      toast('error', 'This part is not available for order yet (weight missing).');
      return;
    }
    cart.addItem({
      partId: part.id,
      name: part.name,
      category: part.category_name,
      price: part.average_price,
      weightKg: part.weight_kg,
      quantity,
      imageUrl: part.image_url || undefined,
    });
    toast('success', `${part.name} added to cart`);
  }

  function handleBuyNow() {
    addToCart();
    router.push('/checkout');
  }

  function copyLink() {
    navigator.clipboard
      .writeText(`${window.location.origin}/product/${id}`)
      .then(() => toast('success', 'Link copied to clipboard'))
      .catch(() => toast('error', 'Failed to copy link'));
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Package className="h-12 w-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          {error || 'Part not found'}
        </p>
        <Link
          href="/search"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 lg:px-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 py-4 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link href="/search" className="text-slate-500 hover:text-slate-700">
          Shop
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-900 line-clamp-1">
          {part.name}
        </span>
      </nav>

      {/* Main content: image gallery + product info */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* ── Image Gallery ── */}
        <div className="flex w-full flex-col-reverse gap-3 lg:w-1/2 lg:flex-row">
          {/* Vertical thumbnails (desktop) / Horizontal thumbnails (mobile) */}
          {images.length > 1 && (
            <div className="flex gap-2 lg:flex-col lg:gap-3">
              {/* Up / Left arrow */}
              {thumbStartIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setThumbStartIndex((i) => Math.max(0, i - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E07A3A] text-[#E07A3A] transition-colors hover:bg-[#E07A3A]/10 lg:w-16"
                >
                  <ChevronUp className="hidden h-4 w-4 lg:block" />
                  <ChevronDown className="h-4 w-4 rotate-90 lg:hidden" />
                </button>
              )}

              {images
                .slice(thumbStartIndex, thumbStartIndex + VISIBLE_THUMBS)
                .map((img, i) => {
                  const realIndex = thumbStartIndex + i;
                  return (
                    <button
                      key={realIndex}
                      type="button"
                      onClick={() => setSelectedImageIndex(realIndex)}
                      className={cn(
                        'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                        realIndex === selectedImageIndex
                          ? 'border-[#E07A3A]'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}

              {/* Down / Right arrow */}
              {thumbStartIndex + VISIBLE_THUMBS < images.length && (
                <button
                  type="button"
                  onClick={() => setThumbStartIndex((i) => i + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E07A3A] text-[#E07A3A] transition-colors hover:bg-[#E07A3A]/10 lg:w-16"
                >
                  <ChevronDown className="hidden h-4 w-4 lg:block" />
                  <ChevronUp className="h-4 w-4 rotate-90 lg:hidden" />
                </button>
              )}
            </div>
          )}

          {/* Main image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {images.length > 0 ? (
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={part.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-20 w-20 text-slate-200" />
              </div>
            )}
          </div>
        </div>

        {/* ── Product Info ── */}
        <div className="w-full lg:w-1/2">
          {/* Product name */}
          <h1 className="font-marketing-display text-2xl font-bold text-slate-900 lg:text-3xl">
            {part.name}
          </h1>

          {/* Dispatch + availability */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Truck className="h-4 w-4" />
              Express 45-min delivery
            </span>
            <span className="flex items-center gap-1.5 font-medium text-green-600">
              <CheckCircle className="h-4 w-4" />
              In Stock
            </span>
          </div>

          {/* Brand / Category */}
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-slate-500">Brand:</span>
              <span className="font-medium text-slate-900">
                {part.category_name}
              </span>
            </div>
            {part.oem_code && (
              <div className="flex gap-2">
                <span className="text-slate-500">OEM Code:</span>
                <span className="font-medium text-slate-900">
                  {part.oem_code}
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <p className="mt-5 text-3xl font-bold text-slate-900">
            {part.average_price
              ? formatCurrency(part.average_price)
              : 'Price on request'}
          </p>

          <hr className="my-5 border-slate-200" />

          {/* Compatible vehicles */}
          {part.compatible_vehicles && part.compatible_vehicles.length > 0 && (
            <div className="mb-5">
              <h3 className="font-marketing-display mb-2 text-sm font-semibold text-slate-700">
                Compatible Vehicles
              </h3>
              <div className="flex flex-wrap gap-2">
                {part.compatible_vehicles.map((v, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {v.make} {v.model} ({v.year_start}
                    {v.year_end !== v.year_start ? `–${v.year_end}` : ''})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity selector */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={addToCart}
              disabled={!part.average_price}
              className="flex h-12 flex-1 items-center justify-center rounded-lg bg-primary font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!part.average_price}
              className="flex h-12 flex-1 items-center justify-center rounded-lg border-2 border-primary font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
            >
              Buy now
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            onClick={copyLink}
            className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <Link2 className="h-4 w-4" />
            Share product link
          </button>

          {/* Description */}
          <div className="mt-6">
            <h3 className="font-marketing-display mb-2 text-sm font-semibold text-slate-700">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {part.name}
              {part.subcategory ? ` — ${part.subcategory}` : ''}.{' '}
              {part.category_name} category part
              {part.oem_code ? ` (OEM: ${part.oem_code})` : ''}.
              {part.weight_kg
                ? ` Weighs approximately ${part.weight_kg} kg.`
                : ''}
              {part.compatible_vehicles && part.compatible_vehicles.length > 0
                ? ` Compatible with ${part.compatible_vehicles
                    .map(
                      (v) =>
                        `${v.make} ${v.model} (${v.year_start}–${v.year_end})`
                    )
                    .join(', ')}.`
                : ''}
            </p>
          </div>

          {/* Safe checkout badge */}
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              100% Guarantee Safe Checkout
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
