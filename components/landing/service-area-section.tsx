import Image from 'next/image';
import { Clock, Bus, BadgeCheck, Package } from 'lucide-react';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { MarketingCanvas, MARKETING_GUTTER_CLASS, marketingType } from '@/components/layout/marketing-canvas';

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-[160px] flex-col items-start">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-white" strokeWidth={2} />
        <span
          className={`${marketingFont.className} text-sm font-medium leading-5 tracking-[-0.01em] text-[#F3F3F3]`}
        >
          {label}
        </span>
      </div>
      <span
        className={`${marketingFont.className} text-xs font-normal leading-5 tracking-[-0.01em] text-[#9F9F9F]`}
      >
        {value}
      </span>
    </div>
  );
}

function MarketCard({
  title,
  description,
  stats,
  className,
}: {
  title: string;
  description: string;
  stats: Array<{ icon: typeof Clock; label: string; value: string }>;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate flex w-full max-w-[493px] flex-col justify-between overflow-hidden rounded-xl px-[35px] py-4 ${className ?? ''}`}
      style={{ background: 'rgba(255, 255, 255, 0.16)', height: 208 }}
    >
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex max-w-[317px] flex-col gap-3">
          <h3 className="font-marketing-display text-xl leading-7 text-white sm:leading-[29px]">
            {title}
          </h3>
          <p
            className={`${marketingFont.className} text-sm font-medium leading-[22px] tracking-[-0.01em] text-[#C0C0C0]`}
          >
            {description}
          </p>
        </div>
        <div className="flex gap-4">
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
      <Package
        className="pointer-events-none absolute -right-6 -bottom-8 z-[1] h-[231px] w-[231px] text-white/20"
        strokeWidth={1}
        aria-hidden
        style={{ opacity: 0.43 }}
      />
    </div>
  );
}

export function ServiceAreaSection() {
  return (
    <section id="markets" className="scroll-mt-20 bg-[#F8F8F8]">
      <MarketingCanvas className={`py-7 ${MARKETING_GUTTER_CLASS}`}>
      <div className="relative w-full overflow-hidden rounded-[20px] bg-white lg:h-[683px]">
        <div className="absolute inset-0 lg:-left-[347px] lg:-top-[5px] lg:h-[872px] lg:w-[1309px] lg:inset-auto">
          <Image
            src="/images/landing/markets-banner.png"
            alt="Mechanic inspecting a vehicle wheel"
            fill
            className="object-cover object-[-80%_center]"
            sizes="(min-width: 1440px) 1440px, 100vw"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(107.56deg, rgba(42, 41, 41, 0) 2.41%, rgba(42, 41, 41, 0.49) 21.19%, #2A2929 50.55%)',
          }}
        />

        <div className="relative z-10 flex flex-col gap-10 px-6 py-10 sm:px-10 lg:h-full lg:px-0 lg:py-0">
          <div className="lg:absolute lg:bottom-[95px] lg:left-[62px] lg:w-[411px]">
            <h2 className={`font-marketing-display max-w-[321px] text-white ${marketingType.section}`}>
              Serving Lagos Markets
            </h2>
            <p
              className={`${marketingFont.className} mt-2 max-w-[338px] text-sm leading-5 tracking-[-0.01em] text-[#E7E7E7]`}
            >
              No apps to learn, no market trips, no guesswork. Just parts at
              your door.
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:contents">
            <MarketCard
              className="lg:absolute lg:left-[601px] lg:top-[97px]"
              title="Ladipo Market, Mushin"
              description="The largest auto parts market in West Africa. Our runners know every stall."
              stats={[
                { icon: Clock, label: 'Open Daily', value: '6:00 AM – 8:00 PM' },
                { icon: Bus, label: 'Average Fulfillment', value: 'Same Day' },
              ]}
            />
            <MarketCard
              className="lg:absolute lg:left-[749px] lg:top-[325px]"
              title="ASPAMDA, Trade Fair"
              description="International trade complex for imported parts. Direct from importers to you."
              stats={[
                { icon: Clock, label: 'Open Daily', value: '6:00 AM – 8:00 PM' },
                { icon: BadgeCheck, label: 'Verified Vendors', value: '200+' },
              ]}
            />
          </div>
        </div>
      </div>
      </MarketingCanvas>
    </section>
  );
}
