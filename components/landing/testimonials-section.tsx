import Image from 'next/image';
import { marketingFont, workSans } from '@/lib/fonts/marketing-font';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas, MARKETING_GUTTER_CLASS, marketingType } from '@/components/layout/marketing-canvas';

function OrangeWave() {
  return (
    <div
      className="pointer-events-none absolute opacity-[0.29]"
      style={{ left: -17, top: 38, width: 389, height: 324 }}
      aria-hidden
    >
      <svg viewBox="0 0 389 324" className="h-full w-full" fill="none">
        {Array.from({ length: 24 }, (_, i) => {
          const t = i / 23;
          return (
            <ellipse
              key={i}
              cx={194 + t * 70}
              cy={162 + t * 55}
              rx={194 - t * 147}
              ry={162 - t * 123}
              stroke="#FEBA7A"
              strokeWidth="0.3"
            />
          );
        })}
      </svg>
    </div>
  );
}

function Author({
  src,
  name,
  role,
  light,
}: {
  src: string;
  name: string;
  role: string;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={src}
        alt=""
        width={47}
        height={47}
        className="h-[47px] w-[47px] rounded-full object-cover"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={cn(
            marketingFont.className,
            'text-base font-semibold leading-[19px]',
            light ? 'text-white' : 'text-[#232323]'
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            marketingFont.className,
            'whitespace-nowrap text-base font-normal leading-[19px]',
            light ? 'text-[#F1F1F1]' : 'text-[#93a3af]'
          )}
        >
          {role}
        </p>
      </div>
    </div>
  );
}

function QuoteMark({ className }: { className: string }) {
  return (
    <span className={`${workSans.className} text-2xl font-normal leading-8 sm:text-[32px] sm:leading-[38px] ${className}`}>
      “
    </span>
  );
}

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="scroll-mt-20 bg-[#F8F8F8]"
    >
      <MarketingCanvas className={`flex flex-col items-center py-14 lg:py-[59px] ${MARKETING_GUTTER_CLASS}`}>
      <div className="flex w-full max-w-[1117px] flex-col items-center gap-12 lg:gap-[59px]">
        <h2             className={`${marketingFont.className} text-center text-xl font-semibold tracking-[-0.025em] text-[#000929] sm:text-[24px] sm:leading-10`}>
          What our customers are saying
        </h2>

        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-stretch">
          <article className="relative overflow-hidden rounded-xl bg-[#E57105] p-4 lg:w-[354px] lg:shrink-0">
            <OrangeWave />
            <div className="relative z-10 flex flex-col justify-between gap-8">
              <div className="flex flex-col">
                <QuoteMark className="text-white" />
                <p
                  className={`${marketingFont.className} text-sm leading-5 tracking-[-0.01em] text-white`}
                >
                  used to spend half my day driving to Ladipo just to find one
                  part. Now I place an order and keep working while it&apos;s
                  delivered. It&apos;s saved me hours every week.
                </p>
              </div>
              <Author
                src="/images/landing/avatars/tunde.jpg"
                name="Tunde A."
                role="Auto Mechanic, Yaba"
                light
              />
            </div>
          </article>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl bg-white p-4">
                <div className="flex flex-col justify-between gap-6">
                  <div className="flex flex-col">
                    <QuoteMark className="text-[#232323]" />
                    <p
                      className={`${marketingFont.className} text-sm leading-5 tracking-[-0.01em] text-[#93a3af]`}
                    >
                      The delivery was much faster than I expected, and the part
                      matched perfectly. No more calling multiple vendors or
                      walking around the market looking for availability.
                    </p>
                  </div>
                  <Author
                    src="/images/landing/avatars/chinedu.jpg"
                    name="Chinedu E."
                    role="Car Owner, Lekki"
                  />
                </div>
              </article>

              <article className="rounded-xl bg-white p-4">
                <div className="flex flex-col justify-between gap-6">
                  <div className="flex flex-col">
                    <QuoteMark className="text-[#232323]" />
                    <p
                      className={`${marketingFont.className} text-sm leading-5 tracking-[-0.01em] text-[#93a3af]`}
                    >
                      The ordering process was straightforward, and I loved
                      getting updates throughout the delivery. It&apos;s become
                      our first option whenever we need replacement parts.
                    </p>
                  </div>
                  <Author
                    src="/images/landing/avatars/grace.jpg"
                    name="Grace O."
                    role="Fleet Operations Coordinator"
                  />
                </div>
              </article>
            </div>

            <div
              className={`${marketingFont.className} flex flex-row items-center justify-around gap-2 rounded-xl bg-white px-3 py-6 sm:gap-0 sm:px-6 sm:py-8`}
            >
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <p className="text-xl font-semibold leading-7 text-[#232323] sm:text-[32px] sm:leading-[39px]">
                  50,000+
                </p>
                <p className="text-sm leading-[19px] text-[#93a3af] sm:text-base">Parts</p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 border-l border-dashed border-[#B9B9B9] px-2 text-center sm:px-[62px]">
                <p className="text-xl font-semibold leading-7 text-[#232323] sm:text-[32px] sm:leading-[39px]">
                  20+
                </p>
                <p className="text-sm leading-[19px] text-[#93a3af] sm:text-base">
                  Trusted Dealers
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 border-l border-dashed border-[#B9B9B9] px-2 text-center sm:px-[62px]">
                <p className="text-xl font-semibold leading-7 text-[#232323] sm:text-[32px] sm:leading-[39px]">
                  24/7
                </p>
                <p className="text-sm leading-[19px] text-[#93a3af] sm:text-base">
                  Availability
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </MarketingCanvas>
    </section>
  );
}
