'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

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

const GAP_PX = 16;
const MOVE_MS = 450;
const PAUSE_MS = 5000;

export function HeroGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [stepPx, setStepPx] = useState(0);
  const [instant, setInstant] = useState(false);
  const slides = [...galleryImages, ...galleryImages, ...galleryImages];

  useEffect(() => {
    const measure = () => {
      const slide = trackRef.current?.querySelector<HTMLElement>('[data-hero-slide]');
      if (!slide) return;
      setStepPx(slide.getBoundingClientRect().width + GAP_PX);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      setIndex((current) => current + 1);
    }, MOVE_MS + PAUSE_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (index < galleryImages.length) return;

    const resetId = window.setTimeout(() => {
      setInstant(true);
      setIndex(0);
    }, MOVE_MS);

    return () => window.clearTimeout(resetId);
  }, [index]);

  useEffect(() => {
    if (!instant) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setInstant(false));
    });
    return () => cancelAnimationFrame(frame);
  }, [instant]);

  return (
    <div className="relative mt-3 h-[220px] w-full overflow-hidden bg-[#FAFAFA] sm:h-[280px] lg:absolute lg:inset-x-0 lg:top-[446px] lg:mt-0 lg:h-[358px]">
      <div
        ref={trackRef}
        className="flex h-full w-max gap-4"
        style={{
          transform: stepPx ? `translateX(-${index * stepPx}px)` : undefined,
          transition: instant ? 'none' : `transform ${MOVE_MS}ms ease-in-out`,
        }}
      >
        {slides.map((image, slideIndex) => (
          <div
            key={`${image.src}-${slideIndex}`}
            data-hero-slide
            className="relative h-full w-[240px] shrink-0 overflow-hidden rounded-xl sm:w-[320px] lg:w-[395px]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="395px"
              priority={slideIndex < 4}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
