'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Package, Search as SearchIcon } from 'lucide-react';
import { SearchInput } from '@/components/forms/search-input';
import { PartCard } from '@/components/orders/part-card';
import { PartDetailSheet } from '@/components/orders/part-detail-sheet';
import { usePartsSearch } from '@/lib/hooks/use-parts-search';
import { useCart } from '@/lib/hooks/use-cart';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import { formatVehicleLabelShort } from '@/lib/utils/vehicle-fitment';
import { SearchVehicleBar } from '@/components/search/search-vehicle-bar';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect, Suspense } from 'react';
import type { CatalogPart } from '@/lib/types/catalog';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('category') || '';
  const { selectedVehicle, selectedVehicleId, fitMyCar } = useSelectedVehicle();

  const {
    results,
    isLoading,
    hasMore,
    total,
    loadMore,
    query,
    setQuery,
    category,
    setCategory,
  } = usePartsSearch({
    initialCategory,
    vehicleId: selectedVehicleId,
    fitMyCar,
  });

  const [selectedPart, setSelectedPart] = useState<CatalogPart | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; slug: string; name: string; part_count: number }>
  >([]);

  const cart = useCart();

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setCategories(data.categories ?? []);
      })
      .catch(() => setCategories([]));
  }, []);

  function addToCart(part: CatalogPart, quantity: number) {
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

  function handleCategorySelect(slug: string) {
    const newCat = category === slug ? '' : slug;
    setCategory(newCat);
    const params = new URLSearchParams(searchParams.toString());
    if (newCat) {
      params.set('category', newCat);
    } else {
      params.delete('category');
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Search Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pb-3 pt-4 lg:top-[6.5rem]">
        <SearchInput
          value={query}
          onChange={setQuery}
          autoFocus
        />

        <SearchVehicleBar />

        {/* Category Chips */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.slug)}
              className={cn(
                'shrink-0 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors',
                category === cat.slug
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4">
        {/* Result count */}
        {!isLoading && (query || category || fitMyCar) && (
          <p className="mb-3 text-xs text-slate-500">
            {total} result{total !== 1 ? 's' : ''} found
            {fitMyCar && selectedVehicle && (
              <> for {formatVehicleLabelShort(selectedVehicle)}</>
            )}
            {!fitMyCar && selectedVehicle && (query || category) && (
              <> · fitment for {formatVehicleLabelShort(selectedVehicle)}</>
            )}
          </p>
        )}

        {/* Loading state */}
        {isLoading && results.length === 0 && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            {query || category ? (
              <>
                <Package className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No parts found</p>
                <p className="text-xs text-slate-400">
                  Try a different search or category
                </p>
              </>
            ) : (
              <>
                <SearchIcon className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  Search for spare parts
                </p>
                <p className="text-xs text-slate-400">
                  Search by name or browse by category
                </p>
              </>
            )}
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {results.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => setSelectedPart(part)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-slate-200 bg-white py-3 text-sm font-medium text-primary hover:bg-slate-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Load more'
            )}
          </button>
        )}
      </div>

      {/* Part Detail Sheet */}
      <PartDetailSheet
        part={selectedPart}
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        onAddToCart={addToCart!}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
