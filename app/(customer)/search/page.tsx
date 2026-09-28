'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Package,
  Search as SearchIcon,
  ChevronDown,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { SearchInput } from '@/components/forms/search-input';
import { PartCard } from '@/components/orders/part-card';
import { usePartsSearch } from '@/lib/hooks/use-parts-search';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import { SearchVehicleBar } from '@/components/search/search-vehicle-bar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect, Suspense } from 'react';

type ViewMode = 'grid' | 'list';
type SortOption = 'trending' | 'price_asc' | 'price_desc' | 'newest';

const sortLabels: Record<SortOption, string> = {
  trending: 'Trending',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  newest: 'Newest',
};

const MAX_PRICE = 500000;

const PRICE_PRESETS = [
  { label: 'All Price', min: 0, max: MAX_PRICE },
  { label: 'Under \u20A620,000', min: 0, max: 20000 },
  { label: '\u20A620,000 to \u20A650,000', min: 20000, max: 50000 },
  { label: '\u20A650,000 to \u20A6100,000', min: 50000, max: 100000 },
  { label: '\u20A6100,000 to \u20A6200,000', min: 100000, max: 200000 },
  { label: 'Over \u20A6200,000', min: 200000, max: MAX_PRICE },
];

const POPULAR_BRANDS = [
  'Denso', 'Bosch', 'NGK', 'Toyota Genuine', 'Brembo', 'Aisin',
  'Monroe', 'Delphi', 'Castrol', 'Mobil 1', 'Mann Filter', 'Champion',
  'One Plus',
];

const POPULAR_MODELS = [
  'Corolla', 'Camry', 'Accord', 'TV', 'RX 350', 'Avalon',
  'Highlander', 'Rav 4', 'Hilux', 'Sienna', 'Rio', 'Sportage',
  'Land cruiser',
];

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

  const [categories, setCategories] = useState<
    Array<{ id: string; slug: string; name: string; part_count: number }>
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setCategories(data.categories ?? []);
      })
      .catch(() => setCategories([]));
  }, []);

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
      <Breadcrumb
        items={[
          { label: 'Home', href: '/dashboard' },
          ...(activeCategoryName
            ? [{ label: 'Shop', href: '/search' }, { label: activeCategoryName }]
            : [{ label: 'Shop' }]),
        ]}
      />

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
        <aside className="relative z-10 hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[4.5rem] flex max-h-[calc(100vh-5rem)] flex-col">
            {/* Vehicle bar — desktop */}
            <div className="mb-4 shrink-0">
              <SearchVehicleBar />
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-subtle">
              {/* Category heading + result count */}
              <div className="mb-5 flex items-baseline justify-between">
                <h3 className="font-marketing-display text-base font-bold uppercase tracking-wide text-[#0A0A0A]">
                  Category
                </h3>
                <p className="text-sm text-[#737373]">
                  <span className="font-semibold text-[#0A0A0A]">{total.toLocaleString()}</span>{' '}
                  Results found.
                </p>
              </div>

              {/* Category radio list */}
              <div className="space-y-4">
                {/* All Categories */}
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      !category ? 'border-[#FF6600]' : 'border-slate-300'
                    )}
                  >
                    {!category && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF6600]" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="category"
                    className="sr-only"
                    checked={!category}
                    onChange={() => handleCategorySelect('')}
                  />
                  <span
                    className={cn(
                      'transition-colors',
                      !category ? 'font-semibold text-[#0A0A0A]' : 'text-[slate-500]'
                    )}
                  >
                    All Categories
                  </span>
                </label>

                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        category === cat.slug
                          ? 'border-[#FF6600]'
                          : 'border-slate-300'
                      )}
                    >
                      {category === cat.slug && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FF6600]" />
                      )}
                    </span>
                    <input
                      type="radio"
                      name="category"
                      className="sr-only"
                      checked={category === cat.slug}
                      onChange={() => handleCategorySelect(cat.slug)}
                    />
                    <span
                      className={cn(
                        'transition-colors',
                        category === cat.slug
                          ? 'font-semibold text-[#0A0A0A]'
                          : 'text-[slate-500]'
                      )}
                    >
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>

              {/* ── Price Range ── */}
              <hr className="my-6 border-slate-200" />

              <h3 className="font-marketing-display mb-5 text-base font-bold uppercase tracking-wide text-slate-900">
                Price Range
              </h3>

              {/* Range slider */}
              <div className="relative mb-4 h-6">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-200" />
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-[#FF6600]"
                  style={{
                    left: `${(priceMin / MAX_PRICE) * 100}%`,
                    right: `${100 - (priceMax / MAX_PRICE) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={1000}
                  value={priceMin}
                  onChange={(e) => setPriceMin(Math.min(Number(e.target.value), priceMax - 1000))}
                  className="price-range-thumb pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2"
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={1000}
                  value={priceMax}
                  onChange={(e) => setPriceMax(Math.max(Number(e.target.value), priceMin + 1000))}
                  className="price-range-thumb pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2"
                />
              </div>

              {/* Min / Max inputs */}
              <div className="mb-4 flex gap-3">
                <input
                  type="text"
                  placeholder="Min price"
                  value={priceMin > 0 ? priceMin.toLocaleString() : ''}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/\D/g, ''));
                    if (!isNaN(v)) setPriceMin(v);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#FF6600] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Max price"
                  value={priceMax < MAX_PRICE ? priceMax.toLocaleString() : ''}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/\D/g, ''));
                    if (!isNaN(v)) setPriceMax(v);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#FF6600] focus:outline-none"
                />
              </div>

              {/* Price presets */}
              <div className="space-y-4">
                {PRICE_PRESETS.map((preset) => (
                  <label
                    key={preset.label}
                    className="flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        priceMin === preset.min && priceMax === preset.max
                          ? 'border-[#FF6600]'
                          : 'border-slate-300'
                      )}
                    >
                      {priceMin === preset.min && priceMax === preset.max && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FF6600]" />
                      )}
                    </span>
                    <input
                      type="radio"
                      name="price-range"
                      className="sr-only"
                      checked={priceMin === preset.min && priceMax === preset.max}
                      onChange={() => {
                        setPriceMin(preset.min);
                        setPriceMax(preset.max);
                      }}
                    />
                    <span
                      className={cn(
                        'transition-colors',
                        priceMin === preset.min && priceMax === preset.max
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-500'
                      )}
                    >
                      {preset.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* ── Popular Brands ── */}
              <hr className="my-6 border-slate-200" />

              <h3 className="font-marketing-display mb-5 text-base font-bold uppercase tracking-wide text-slate-900">
                Popular Brands
              </h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {POPULAR_BRANDS.map((brand) => {
                  const isSelected = selectedBrands.has(brand);
                  return (
                    <label
                      key={brand}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <span
                        className={cn(
                          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
                          isSelected
                            ? 'border-[#FF6600] bg-[#FF6600]'
                            : 'border-slate-300 bg-white'
                        )}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedBrands((prev) => {
                            const next = new Set(prev);
                            if (next.has(brand)) {
                              next.delete(brand);
                            } else {
                              next.add(brand);
                            }
                            return next;
                          });
                        }}
                      />
                      <span className={cn('transition-colors', isSelected ? 'font-medium text-slate-900' : 'text-slate-500')}>
                        {brand}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* ── Popular Models ── */}
              <hr className="my-6 border-slate-200" />

              <h3 className="font-marketing-display mb-5 text-base font-bold uppercase tracking-wide text-slate-900">
                Popular Model
              </h3>

              <div className="flex flex-wrap gap-2 pb-4">
                {POPULAR_MODELS.map((model) => {
                  const isSelected = selectedModel === model;
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setSelectedModel(isSelected ? null : model)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        isSelected
                          ? 'border-[#FF6600] font-medium text-[#FF6600]'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      {model}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="min-w-0 flex-1 mb-5">
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
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <Button
              variant="secondary"
              fullWidth
              isLoading={isLoading}
              onClick={loadMore}
              className="mt-6"
            >
              Load mores
            </Button>
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
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-marketing-display text-lg font-bold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h4 className="font-marketing-display mb-4 text-base font-bold uppercase tracking-wide text-slate-900">
              Category
            </h4>

            <div className="space-y-4">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      category === cat.slug ? 'border-[#FF6600]' : 'border-slate-300'
                    )}
                  >
                    {category === cat.slug && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF6600]" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="mobile-category"
                    className="sr-only"
                    checked={category === cat.slug}
                    onChange={() => handleCategorySelect(cat.slug)}
                  />
                  <span
                    className={cn(
                      'flex-1 transition-colors',
                      category === cat.slug ? 'font-semibold text-slate-900' : 'text-slate-500'
                    )}
                  >
                    {cat.name}
                  </span>
                </label>
              ))}
            </div>

            <hr className="my-5 border-slate-200" />

            <h4 className="font-marketing-display mb-4 text-base font-bold uppercase tracking-wide text-slate-900">
              Price Range
            </h4>

            <div className="space-y-4">
              {PRICE_PRESETS.map((preset) => (
                <label
                  key={preset.label}
                  className="flex cursor-pointer items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      priceMin === preset.min && priceMax === preset.max
                        ? 'border-[#FF6600]'
                        : 'border-slate-300'
                    )}
                  >
                    {priceMin === preset.min && priceMax === preset.max && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF6600]" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="mobile-price-range"
                    className="sr-only"
                    checked={priceMin === preset.min && priceMax === preset.max}
                    onChange={() => {
                      setPriceMin(preset.min);
                      setPriceMax(preset.max);
                    }}
                  />
                  <span
                    className={cn(
                      'transition-colors',
                      priceMin === preset.min && priceMax === preset.max
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-500'
                    )}
                  >
                    {preset.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

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
