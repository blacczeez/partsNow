'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const trendingProducts = [
  {
    id: '1',
    name: 'Front brake pad',
    sku: 'TCB-4471',
    price: 90000,
    image: '/images/customers/trending-1.png',
    inStock: true,
  },
  {
    id: '2',
    name: 'Front brake pad',
    sku: 'TCB-4471',
    price: 90000,
    image: '/images/customers/trending-2.png',
    inStock: true,
  },
  {
    id: '3',
    name: 'Front brake pad',
    sku: 'TCB-4471',
    price: 90000,
    image: '/images/customers/trending-3.png',
    inStock: true,
  },
  {
    id: '4',
    name: 'Front brake pad',
    sku: 'TCB-4471',
    price: 90000,
    image: '/images/customers/trending-4.png',
    inStock: true,
  },
];

function formatNaira(amount: number) {
  return `\u20A6${amount.toLocaleString()}`;
}

export function TrendingProducts() {
  return (
    <section className="px-4 py-8 lg:px-0 lg:py-10">
      <div className="flex items-center justify-between">
        <h2 className="font-marketing-display text-2xl font-semibold text-slate-900">Trending Product</h2>
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See more
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 scrollbar-hidden lg:-mx-0 lg:px-0">
        {trendingProducts.map((product) => (
          <Link
            key={product.id}
            href={`/search?q=${encodeURIComponent(product.name)}`}
            className="flex w-[220px] shrink-0 flex-col sm:w-[240px] lg:flex-1"
          >
            {/* Image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="240px"
              />
            </div>

            {/* Info */}
            <div className="mt-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-medium text-[#404040]">{product.name}</p>
                  <p className="text-xs text-[#404040]">{product.sku}</p>
                </div>
                {product.inStock && (
                  <span className="shrink-0 text-xs font-medium text-[#1C7C4E]">In-stock</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-base font-semibold text-[#404040]">{formatNaira(product.price)}</p>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  aria-label="Add to cart"
                  onClick={(e) => e.preventDefault()}
                >
                  <ShoppingBag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
