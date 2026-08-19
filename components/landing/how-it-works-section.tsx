'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { MessageCircle, ShieldCheck, Package, type LucideIcon } from 'lucide-react';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas, marketingType } from '@/components/layout/marketing-canvas';

const steps = [
  {
    title: 'Tell Us What You Need',
    description:
      "Send a WhatsApp voice note or search our catalogue. Describe the part, your vehicle, and we'll find it.",
    icon: MessageCircle,
    image: '/images/landing/how-step-talk.png',
    imageAlt: 'Customer sending a parts request from their phone',
  },
  {
    title: 'We Source & Verify',
    description:
      'Our runners go to Ladipo/ASPAMDA, find the exact part, verify quality, and take photos for confirmation.',
    icon: ShieldCheck,
    image: '/images/landing/category-suspensions.png',
    imageAlt: 'Runner verifying a part at the market',
  },
  {
    title: 'Delivered to Your Door',
    description:
      'A dispatch rider picks up and delivers to your workshop or home within 45 minutes.',
    icon: Package,
    image: '/images/landing/how-step-deliver.png',
    imageAlt: 'Dispatch delivering parts to the door',
  },
];

const STEP_COUNT = steps.length;
const DESKTOP_MQ = '(min-width: 1024px)';
/** Pinned scrub length on desktop only. */
const SCROLL_TRACK_CLASS = 'lg:h-[200vh]';

function getActiveStep(track: HTMLElement | null): number {
  if (!track || !window.matchMedia(DESKTOP_MQ).matches) return 0;
  const scrollable = track.offsetHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  const progress = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / scrollable));
  return Math.min(STEP_COUNT - 1, Math.floor(progress * STEP_COUNT));
}

function subscribeToViewport(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  window.addEventListener('resize', onStoreChange);
  const frame = requestAnimationFrame(onStoreChange);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onStoreChange);
    window.removeEventListener('resize', onStoreChange);
  };
}

function WavePattern() {
  return (
    <div
      className="pointer-events-none absolute hidden opacity-[0.07] lg:block"
      style={{
        left: -6,
        top: -191,
        width: 1437,
        height: 704,
        transform: 'rotate(-153.98deg)',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 1437 704" className="h-full w-full" fill="none">
        {Array.from({ length: 24 }, (_, i) => {
          const t = i / 23;
          return (
            <ellipse
              key={i}
              cx={718 + t * 250}
              cy={352 + t * 120}
              rx={718 - t * 550}
              ry={352 - t * 270}
              stroke="rgba(226, 215, 255, 0.51)"
              strokeWidth="1.56"
            />
          );
        })}
      </svg>
    </div>
  );
}


function StepCopy({
  step,
  isActive,
  interactive,
  onSelect,
}: {
  step: (typeof steps)[number];
  isActive: boolean;
  interactive: boolean;
  onSelect?: () => void;
}) {
  const Icon = step.icon as LucideIcon;
  const body = (
    <>
      <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded bg-[#E57105]">
        <Icon className="h-6 w-6 text-white" fill="white" strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col gap-2 sm:gap-4">
        <span className="font-marketing-display text-base font-normal leading-6 text-white sm:text-xl sm:leading-[29px] lg:text-2xl">
          {step.title}
        </span>
        <span
          className={`${marketingFont.className} text-sm font-medium leading-[22px] tracking-[-0.01em] text-[#DBDBDB]`}
        >
          {step.description}
        </span>
      </span>
    </>
  );

  if (!interactive) {
    return <div className="flex items-start gap-[29px]">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-1 items-center gap-[29px] text-left transition-opacity duration-300',
        isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'
      )}
    >
      {body}
    </button>
  );
}

function StepVisual({ step }: { step: number }) {
  const current = steps[step];

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <Image
        src={current.image}
        alt={current.imageAlt}
        fill
        className="object-contain object-left"
        // sizes="(min-width: 1024px) 55vw, 100vw"
        // priority={step === 0}
      />
    </div>
  );
}

export function HowItWorksSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const active = useSyncExternalStore(
    subscribeToViewport,
    () => getActiveStep(trackRef.current),
    () => 0
  );

  const goToStep = useCallback((index: number) => {
    if (!window.matchMedia(DESKTOP_MQ).matches) return;
    const track = trackRef.current;
    if (!track) return;
    const scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + ((index + 0.15) / STEP_COUNT) * scrollable,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div id="how-it-works" ref={trackRef} className={cn('relative scroll-mt-20', SCROLL_TRACK_CLASS)}>
      <section className="overflow-x-clip bg-[#3E208D] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
        <WavePattern />

        <MarketingCanvas className="relative flex flex-col px-4 py-16 sm:px-10 lg:h-full lg:min-h-0 lg:px-[87px] lg:py-10">
          <h2 className={`font-marketing-display shrink-0 text-center text-white lg:pt-2 ${marketingType.section}`}>
            How It Works
          </h2>

          <div className="mt-10 flex flex-col lg:hidden">
            <div className="flex w-full min-w-0 flex-col gap-8">
              {steps.map((step) => (
                <StepCopy key={step.title} step={step} isActive interactive={false} />
              ))}
            </div>
          </div>

          <div className="mt-6 hidden min-h-0 flex-1 flex-col items-center justify-center lg:mt-8 lg:flex">
            <div className="flex h-full max-h-[700px] w-full min-h-0 items-stretch gap-[60px]">
              <StepVisual step={active} />

              <div className="flex min-h-0 w-full max-w-[635px] flex-1 items-stretch gap-[60px]">
                <div className="flex h-full w-1.5 flex-col gap-3" aria-hidden>
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-lg transition-colors duration-300"
                      style={{
                        background:
                          index === active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.32)',
                      }}
                    />
                  ))}
                </div>

                <div className="flex h-full w-full flex-col gap-3">
                  {steps.map((step, index) => (
                    <StepCopy
                      key={step.title}
                      step={step}
                      isActive={index === active}
                      interactive
                      onSelect={() => goToStep(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MarketingCanvas>
      </section>
    </div>
  );
}
