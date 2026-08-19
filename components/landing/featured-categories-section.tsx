import Image from 'next/image';
import Link from 'next/link';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas, marketingType } from '@/components/layout/marketing-canvas';

const categories = [
  {
    name: 'Engine',
    href: '/search?category=engine',
    src: '/images/landing/category-engine.jpg',
    alt: 'Car engine components',
  },
  {
    name: 'Brakes',
    href: '/search?category=brakes',
    src: '/images/landing/category-brakes.jpg',
    alt: 'Brake and workshop parts',
  },
  {
    name: 'Suspension',
    href: '/search?category=suspension',
    src: '/images/landing/category-suspension.jpg',
    alt: 'Mechanic working in a workshop',
  },
  {
    name: 'Electrical',
    href: '/search?category=electrical',
    src: '/images/landing/category-electrical.jpg',
    alt: 'Electronic control module circuitry',
  },
  {
    name: 'Filters',
    href: '/search?q=filter',
    src: '/images/landing/category-filters.jpg',
    alt: 'Workshop tools and parts',
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
  return (
    <section className="bg-[#F8F8F8]">
      <MarketingCanvas className="flex flex-col pt-[77px] pb-[95px]">
        <div className="flex flex-col gap-[65px]">
          <div className="flex items-center justify-center px-10">
            <h2 className={`font-marketing-display text-center text-[#232323] ${marketingType.section}`}>
              Featured Categories
            </h2>
          </div>

          <div
            className={`${marketingFont.className} flex w-full gap-4 overflow-x-auto scrollbar-hidden lg:grid lg:grid-cols-5 lg:overflow-visible`}
          >
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="flex w-[220px] shrink-0 flex-col items-start gap-[21px] sm:w-[260px] lg:w-full lg:min-w-0"
              >
                <div className="relative aspect-[29/31] w-full overflow-hidden rounded-xl">
                  <Image
                    src={category.src}
                    alt={category.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 20vw, 260px"
                  />
                </div>
                <span className="text-base font-medium leading-6 text-[#232323] sm:text-xl">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-[80px] flex flex-wrap items-center justify-center gap-x-[42px] gap-y-6 px-6 lg:mt-[130px] lg:flex-nowrap">
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
