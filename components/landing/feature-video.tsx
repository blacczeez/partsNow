'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';

const POSTER_SRC = '/images/landing/category-suspension.png';
const VIDEO_SRC = '/videos/landing/parts-dey-intro.mp4';

export function FeatureVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      // Play can fail if the browser blocks it.
    }
  }, []);

  return (
    <div className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-xl bg-[#0D0D0D] sm:h-[280px] lg:aspect-[430/516] lg:h-auto lg:w-[430px]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        preload="none"
        playsInline
        controls={hasStarted}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onPlay={() => setHasStarted(true)}
        onEnded={() => {
          setHasStarted(false);
          const video = videoRef.current;
          if (video) video.currentTime = 0;
        }}
      />

      {!hasStarted && (
        <button
          type="button"
          onClick={play}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label="Play video"
        >
          <Image
            src={POSTER_SRC}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 430px, 100vw"
            priority={false}
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(13, 13, 13, 0) 44.76%, rgba(13, 13, 13, 0.68) 75.04%, #0D0D0D 100%)',
            }}
          />
          <span
            className="absolute left-1/2 top-[39%] flex h-[41px] w-[41px] -translate-x-1/2 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(217, 217, 217, 0.81)' }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[21px] w-[21px] translate-x-px"
              fill="#000"
              aria-hidden
            >
              <path d="M8 5.14v13.72L19 12 8 5.14Z" />
            </svg>
          </span>
          <span className="absolute bottom-8 left-1/2 w-[min(313px,calc(100%-2rem))] -translate-x-1/2 text-center font-[Helvetica,sans-serif] text-xl font-normal leading-7 text-white lg:bottom-[47px] lg:text-[34px] lg:leading-[39px]">
            Buy with confidence.
          </span>
        </button>
      )}
    </div>
  );
}
