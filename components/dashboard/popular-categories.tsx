'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface Category {
  slug: string;
  name: string;
  part_count: number;
}

const categoryImages: Record<string, string> = {
  brakes: '/images/landing/category-brakes.jpg',
  engine: '/images/landing/category-engine.jpg',
  suspension: '/images/landing/category-suspension.jpg',
  electrical: '/images/landing/category-electrical.jpg',
  filters: '/images/landing/category-filters.jpg',
};

const fallbackImage = '/images/landing/category-engine.jpg';

interface PopularCategoriesProps {
  categories: Category[];
}

export function PopularCategories({ categories }: PopularCategoriesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visible = categories.filter((c) => c.part_count > 0);

  function scrollNext() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector<HTMLElement>('[data-cat-card]');
    const step = card ? card.offsetWidth + 16 : 260;
    scroller.scrollBy({ left: step, behavior: 'smooth' });
  }

  if (visible.length === 0) return null;

  return (
    <section className="px-4 py-8 lg:px-0 lg:py-10">
      <h2 className="font-marketing-display text-2xl font-semibold text-slate-900">
        Explore Popular Categories
      </h2>

      <div className="relative mt-6">
        <div
          ref={scrollerRef}
          className="-mx-4 flex gap-4 overflow-x-auto scroll-smooth px-4 scrollbar-hidden lg:-mx-0 lg:px-0"
        >
          {visible.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              data-cat-card
              className="flex w-[220px] shrink-0 flex-col rounded-xl border border-[#E5E2E2] bg-[#F5F5F5] p-3 transition-shadow hover:shadow-md sm:w-[240px]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                <Image
                  src={categoryImages[cat.slug] ?? fallbackImage}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="240px"
                />
              </div>
              <span className="mt-3 text-base font-semibold text-slate-900">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {visible.length > 4 && (
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next categories"
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 p-2.5 text-slate-700 shadow-sm transition-opacity hover:opacity-80 lg:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
