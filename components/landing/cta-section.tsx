import Link from "next/link";
import { marketingFont } from "@/lib/fonts/marketing-font";
import {
  MarketingCanvas,
  MARKETING_GUTTER_CLASS,
  marketingType,
} from "@/components/layout/marketing-canvas";

const WAVE_PATH =
  "M0 568.922C0 568.922 261.814 639.151 415 634.806C636.317 628.53 801.68 524.012 1022.5 535.198C1224.6 545.436 1440 568.922 1440 568.922V2.77984e-05H0V568.922Z";

const WAVE_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 635" preserveAspectRatio="none"><path d="${WAVE_PATH}" fill="white"/></svg>`,
)}")`;

function CtaBlobs() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[-121px] h-[876px] overflow-hidden"
      aria-hidden
    >
      <div className="absolute left-1/2 top-0 flex w-[2343px] -translate-x-1/2 gap-6">
        <div
          className="h-[426px] w-[765px] rounded-[115px] opacity-41"
          style={{
            background:
              "linear-gradient(68.52deg, rgba(115, 99, 244, 0.2) 51.22%, rgba(159, 147, 255, 0.2) 75.9%)",
          }}
        />
        <div
          className="h-[426px] w-[765px] rounded-[115px]"
          style={{
            background:
              "linear-gradient(180.24deg, rgba(34, 118, 235, 0.2) 50%, rgba(73, 163, 237, 0.2) 57.57%, rgba(167, 157, 245, 0.2) 71.42%, rgba(123, 109, 235, 0.2) 99.79%)",
          }}
        />
        <div
          className="h-[426px] w-[765px] rounded-[115px] opacity-41"
          style={{
            background:
              "linear-gradient(68.52deg, rgba(159, 147, 255, 0.2) 51.22%, rgba(115, 99, 244, 0.2) 75.9%)",
          }}
        />
      </div>
      <div className="absolute left-1/2 top-[450px] flex w-[2343px] -translate-x-1/2 gap-6">
        <div className="h-[426px] w-[765px] rounded-[115px] bg-[rgba(159,147,255,0.2)] opacity-41" />
        <div className="h-[426px] w-[765px] rounded-[115px] bg-[rgba(159,147,255,0.2)]" />
        <div className="h-[426px] w-[765px] rounded-[115px] bg-[rgba(159,147,255,0.2)] opacity-41" />
      </div>
    </div>
  );
}

export function CtaSection() {
  return (
    <section className="relative z-10 overflow-x-clip pb-24 pt-16 sm:pb-32 sm:pt-[120px]">
      {/* Flat fill on mobile — no wave curve or blobs */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#7363F4] sm:hidden"
        aria-hidden
      />
      {/* Curved wave mask from sm and up */}
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          WebkitMaskImage: WAVE_MASK,
          maskImage: WAVE_MASK,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#7363F4]" />
        <CtaBlobs />
      </div>

      <MarketingCanvas
        className={`relative z-10 flex flex-col items-center ${MARKETING_GUTTER_CLASS}`}
      >
        <div className="flex w-full max-w-[659px] flex-col items-center gap-[35px]">
          <div className="flex w-full flex-col items-center gap-4">
            <h2
              className={`font-marketing-display max-w-[523px] text-center text-[#FBFBFB] ${marketingType.cta}`}
            >
              Ready to Find the Right Part?
            </h2>
            <p
              className={`${marketingFont.className} max-w-[441px] text-center text-sm sm:text-base leading-5 tracking-[-0.02em] text-[#E9E9E9]`}
            >
              Stop wasting time searching through unreliable listings. Get
              genuine truck parts from trusted suppliers, delivered quickly and
              backed by expert support whenever you need it.
            </p>
          </div>

          <Link
            href="/search"
            className="font-marketing-display inline-flex h-11 w-[209px] items-center justify-center rounded-[50px] bg-white px-[27px] text-base leading-5 text-[#232323] transition-opacity hover:opacity-90"
          >
            Browse Parts
          </Link>
        </div>
      </MarketingCanvas>
    </section>
  );
}
