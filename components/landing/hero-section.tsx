import Image from 'next/image';
import Link from 'next/link';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { MarketingCanvas, marketingType } from '@/components/layout/marketing-canvas';

const galleryImages = [
  {
    src: '/images/landing/hero-tools.png',
    alt: 'Mechanic pouring oil into an engine',
  },
  {
    src: '/images/landing/hero-mechanic.png',
    alt: 'Mechanic working on a car engine with a wrench',
  },
  {
    src: '/images/landing/hero-engine.jpg',
    alt: 'Close-up of an engine belt and pulleys',
  },
  {
    src: '/images/landing/hero-tire.jpg',
    alt: 'Technician using a tool on machinery',
  },
];

function HeroWavePattern() {
  const count = 24;

  return (
    <div
      className="pointer-events-none absolute hidden opacity-[0.68] lg:block"
      style={{
        left: 830,
        top: -372,
        width: 918.73,
        height: 449.82,
        transform: 'rotate(-134.83deg)',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 919 450" className="h-full w-full" fill="none">
        {Array.from({ length: count }, (_, i) => {
          const t = i / (count - 1);
          return (
            <ellipse
              key={i}
              cx={459 + t * 160}
              cy={225 + t * 80}
              rx={459 - t * 352}
              ry={225 - t * 173}
              stroke="rgba(226, 215, 255, 0.51)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
}

function HeroGallery() {
  const loop = [...galleryImages, ...galleryImages, ...galleryImages];

  return (
    <div className="relative mt-8 h-[220px] w-full overflow-hidden bg-[#FAFAFA] sm:h-[280px] lg:absolute lg:inset-x-0 lg:top-[446px] lg:mt-0 lg:h-[358px]">
      <div className="animate-hero-marquee flex h-full w-max gap-4">
        {loop.map((image, index) => (
          <div
            key={`${image.src}-${index}`}
            className="relative h-full w-[240px] shrink-0 overflow-hidden rounded-xl sm:w-[320px] lg:w-[395px]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="395px"
              priority={index < 4}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative -mt-[69px] overflow-hidden bg-[#F8F8F8]">
      <MarketingCanvas className="relative pb-8 lg:h-[834px] lg:pb-0">
        <HeroWavePattern />

        <div className="relative z-20 mx-auto flex w-full max-w-[737px] flex-col items-center gap-7 px-4 pt-[140px] pb-8 sm:pt-[160px] lg:absolute lg:left-1/2 lg:top-[169px] lg:w-[737px] lg:-translate-x-1/2 lg:p-0">
          <div className="flex w-full flex-col items-center gap-2">
            <h1 className={`font-marketing-display w-full text-center text-[#1E1E1E] ${marketingType.hero}`}>
              Get the Right Car Parts Delivered in{' '}
              <span className="italic text-[#D4943A]">45 Minutes.</span>
            </h1>
            <p
              className={`${marketingFont.className} max-w-[589px] text-center text-base leading-[22px] tracking-[-0.01em] text-[#828282]`}
            >
              You spend half the day in traffic and at the market. We source
              quality parts from Ladipo and ASPAMDA and bring them straight to
              your workshop.
            </p>
          </div>

          <Link
            href="/search"
            className="font-marketing-display inline-flex h-11 w-[171px] items-center justify-center rounded-[50px] bg-[#3E208D] px-[27px] text-base leading-5 text-white transition-opacity hover:opacity-90"
          >
            Browse Parts
          </Link>
        </div>

        <HeroGallery />

        <div
          className="pointer-events-none absolute left-[-358px] top-[132px] z-10 hidden rounded-[50%] bg-[#F8F8F8] lg:block"
          style={{ width: 2155, height: 365 }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[-351px] top-[770px] z-10 hidden rounded-[50%] bg-[#F8F8F8] lg:block"
          style={{ width: 2148, height: 365 }}
          aria-hidden
        />
      </MarketingCanvas>
    </section>
  );
}
