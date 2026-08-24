'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { cn } from '@/lib/utils/cn';
import {
  MarketingCanvas,
  MARKETING_GUTTER_CLASS,
} from '@/components/layout/marketing-canvas';

const categories = [
  {
    name: 'Engine',
    href: '/search?category=engine',
    src: '/images/landing/category-engine.jpg',
    alt: 'Car engine components',
    units: '12,480',
  },
  {
    name: 'Brakes',
    href: '/search?category=brakes',
    src: '/images/landing/category-brakes.jpg',
    alt: 'Brake and workshop parts',
    units: '8,920',
  },
  {
    name: 'Suspension',
    href: '/search?category=suspension',
    src: '/images/landing/category-suspension.jpg',
    alt: 'Mechanic working in a workshop',
    units: '6,340',
  },
  {
    name: 'Electrical',
    href: '/search?category=electrical',
    src: '/images/landing/category-electrical.jpg',
    alt: 'Electronic control module circuitry',
    units: '9,110',
  },
  {
    name: 'Filters',
    href: '/search?q=filter',
    src: '/images/landing/category-filters.jpg',
    alt: 'Workshop tools and parts',
    units: '15,260',
  },
];

const brands = [
  {
    name: 'Volvo',
    src: '/images/landing/brands/volvo.svg',
    width: 96,
    height: 11,
    className: 'h-3.5 w-auto sm:h-4 lg:h-[18px]',
  },
  {
    name: 'Toyota',
    src: '/images/landing/brands/toyota.svg',
    width: 54,
    height: 43,
    className: 'h-8 w-auto sm:h-9 lg:h-[40px]',
  },
  {
    name: 'BMW',
    src: '/images/landing/brands/bmw.svg',
    width: 45,
    height: 46,
    className: 'h-8 w-auto sm:h-9 lg:h-[38px]',
  },
  {
    name: 'Kia',
    src: '/images/landing/brands/kia.svg',
    width: 78,
    height: 41,
    className: 'h-7 w-auto sm:h-8 lg:h-[36px]',
  },
  {
    name: 'Honda',
    src: '/images/landing/brands/honda.svg',
    width: 62,
    height: 38,
    className: 'h-7 w-auto sm:h-8 lg:h-[36px]',
  },
  {
    name: 'Ford',
    src: '/images/landing/brands/ford.svg',
    width: 89,
    height: 37,
    className: 'h-7 w-auto sm:h-8 lg:h-[32px]',
  },
  {
    name: 'Nissan',
    src: '/images/landing/brands/nissan.svg',
    width: 54,
    height: 46,
    className: 'h-8 w-auto sm:h-9 lg:h-[40px]',
  },
  {
    name: 'Lexus',
    src: '/images/landing/brands/lexus.svg',
    width: 83,
    height: 37,
    className: 'h-7 w-auto sm:h-8 lg:h-[34px]',
  },
  {
    name: 'Mercedes-Benz',
    src: '/images/landing/brands/mercedes.svg',
    width: 91,
    height: 52,
    className: 'h-8 w-auto sm:h-9 lg:h-[42px]',
  },
];

export function FeaturedCategoriesSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollNext() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector<HTMLElement>('[data-category-card]');
    const step = card ? card.offsetWidth + 16 : 280;
    scroller.scrollBy({ left: step, behavior: 'smooth' });
  }

  return (
    <section className="bg-[#F8F8F8]">
      <MarketingCanvas className={`flex flex-col py-10 lg:py-12 ${MARKETING_GUTTER_CLASS}`}>
        <div className="flex flex-col gap-8">
          <h2
            className={`${marketingFont.className} text-center text-xl font-semibold tracking-[-0.025em] text-[#000929] sm:text-[24px] sm:leading-10`}
          >
            Featured Categories
          </h2>

          <div className="relative -mx-4 sm:-mx-10">
            <div
              ref={scrollerRef}
              className={`${marketingFont.className} flex gap-4 overflow-x-auto scroll-smooth scrollbar-hidden px-4 sm:px-10`}
            >
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  data-category-card
                  className="flex w-[220px] shrink-0 flex-col gap-4 rounded-[10px] border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#D1D5DB] sm:w-[240px]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#F8F8F8]">
                    <Image
                      src={category.src}
                      alt={category.alt}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold leading-6 tracking-[-0.025em] text-[#000929]">
                      {category.name}
                    </span>
                    <span className="text-xs font-normal leading-5 text-[#9CA3AF]">
                      {category.units} Units Available
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next categories"
              className="absolute top-1/2 right-4 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#E5E7EB] text-[#111827] shadow-sm transition-opacity hover:opacity-90 sm:right-10"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-[42px] gap-y-4 lg:mt-20 lg:flex-nowrap">
          {brands.map((brand) => (
            <img
              key={brand.name}
              src={brand.src}
              alt={brand.name}
              width={brand.width}
              height={brand.height}
              className={cn(
                'object-contain opacity-50 mix-blend-luminosity grayscale',
                brand.className
              )}
            />
          ))}
        </div>
      </MarketingCanvas>
    </section>
  );
}
