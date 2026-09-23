'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Package,
  Search as SearchIcon,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { SearchInput } from '@/components/forms/search-input';
import { PartCard } from '@/components/orders/part-card';
import { PartDetailSheet } from '@/components/orders/part-detail-sheet';
import { usePartsSearch } from '@/lib/hooks/use-parts-search';
import { useCart } from '@/lib/hooks/use-cart';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import { SearchVehicleBar } from '@/components/search/search-vehicle-bar';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect, Suspense } from 'react';
import type { CatalogPart } from '@/lib/types/catalog';

type ViewMode = 'grid' | 'list';
type SortOption = 'trending' | 'price_asc' | 'price_desc' | 'newest';

const sortLabels: Record<SortOption, string> = {
  trending: 'Trending',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  newest: 'Newest',
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('category') || '';
  const { selectedVehicleId, fitMyCar } = useSelectedVehicle();

  const initialQuery = searchParams.get('q') || '';

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
    initialQuery,
    initialCategory,
    vehicleId: selectedVehicleId,
    fitMyCar,
  });

  // Sync query when URL ?q= changes (e.g. from navbar search)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
    // Only react to searchParams changes, not query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [selectedPart, setSelectedPart] = useState<CatalogPart | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; slug: string; name: string; part_count: number }>
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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
    setMobileFilterOpen(false);
  }

  const activeCategoryName = categories.find((c) => c.slug === category)?.name;

  return (
    <div className="px-4 lg:px-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 py-4 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-900">Shop</span>
        {activeCategoryName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-900">{activeCategoryName}</span>
          </>
        )}
      </nav>

      {/* Search bar — mobile only (desktop uses navbar search) */}
      <div className="mb-4 lg:hidden">
        <SearchInput value={query} onChange={setQuery} />
      </div>

      {/* Vehicle bar — mobile only */}
      <div className="mb-4 lg:hidden">
        <SearchVehicleBar />
      </div>

      <div className="flex gap-8">
        {/* ── Left Sidebar (desktop) ── */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            {/* Vehicle bar — desktop */}
            <div className="mb-6">
              <SearchVehicleBar />
            </div>

            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">
              Category
            </h3>

            <div className="space-y-1">
              {/* All categories option */}
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  !category
                    ? 'bg-slate-100 font-medium text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                    !category
                      ? 'border-slate-900'
                      : 'border-slate-300'
                  )}
                >
                  {!category && (
                    <span className="h-2 w-2 rounded-full bg-slate-900" />
                  )}
                </span>
                <input
                  type="radio"
                  name="category"
                  className="sr-only"
                  checked={!category}
                  onChange={() => handleCategorySelect('')}
                />
                All Categories
              </label>

              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    category === cat.slug
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      category === cat.slug
                        ? 'border-slate-900'
                        : 'border-slate-300'
                    )}
                  >
                    {category === cat.slug && (
                      <span className="h-2 w-2 rounded-full bg-slate-900" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="category"
                    className="sr-only"
                    checked={category === cat.slug}
                    onChange={() => handleCategorySelect(cat.slug)}
                  />
                  <span className="flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-400">{cat.part_count}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="min-w-0 flex-1">
          {/* Top bar: result count + sort + view toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile filter toggle */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {category && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                    1
                  </span>
                )}
              </button>

              <p className="text-sm text-slate-500">
                {isLoading && results.length === 0
                  ? 'Searching...'
                  : `${total} product${total !== 1 ? 's' : ''} found`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <span className="hidden sm:inline">Sort by:</span>
                  <span className="font-medium text-slate-900">{sortLabels[sortBy]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {sortOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setSortOpen(false)}
                    />
                    <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSortBy(opt);
                            setSortOpen(false);
                          }}
                          className={cn(
                            'block w-full px-4 py-2 text-left text-sm',
                            sortBy === opt
                              ? 'bg-slate-100 font-medium text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {sortLabels[opt]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* View toggle */}
              <div className="hidden items-center rounded-lg border border-slate-200 sm:flex">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex items-center justify-center p-2',
                    viewMode === 'grid'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center justify-center p-2',
                    viewMode === 'list'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

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
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4'
                  : 'flex flex-col gap-3'
              )}
            >
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
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-card border border-slate-200 bg-white py-3 text-sm font-medium text-primary hover:bg-slate-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Load more'
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900">
              Category
            </h4>

            <div className="space-y-1">
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm',
                  !category
                    ? 'bg-slate-100 font-medium text-slate-900'
                    : 'text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    !category ? 'border-slate-900' : 'border-slate-300'
                  )}
                >
                  {!category && (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  )}
                </span>
                <input
                  type="radio"
                  name="mobile-category"
                  className="sr-only"
                  checked={!category}
                  onChange={() => handleCategorySelect('')}
                />
                All Categories
              </label>

              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm',
                    category === cat.slug
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      category === cat.slug ? 'border-slate-900' : 'border-slate-300'
                    )}
                  >
                    {category === cat.slug && (
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="mobile-category"
                    className="sr-only"
                    checked={category === cat.slug}
                    onChange={() => handleCategorySelect(cat.slug)}
                  />
                  <span className="flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-400">{cat.part_count}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

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
