import Image from 'next/image';
import Link from 'next/link';

export function PromoBanners() {
  return (
    <section className="px-4 pb-8 lg:px-0">
      {/* Top full-width banner */}
      <Link href="/search" className="relative block w-full overflow-hidden rounded-xl">
        <Image
          src="/images/customers/promo-top.png"
          alt="Your one-stop auto shop for car parts"
          width={1400}
          height={360}
          className="h-auto w-full object-cover"
        />
      </Link>

      {/* Bottom two banners */}
      <div className="mt-4 flex h-52 gap-4 lg:h-64">
        <Link href="/search" className="relative block flex-[35] overflow-hidden rounded-xl">
          <Image
            src="/images/customers/promo-left.png"
            alt="100% authentic car parts"
            fill
            className="object-cover"
          />
        </Link>
        <Link href="/search" className="relative block flex-[65] overflow-hidden rounded-xl">
          <Image
            src="/images/customers/promo-right.png"
            alt="Quality auto parts you can trust"
            fill
            className="object-cover"
          />
        </Link>
      </div>
    </section>
  );
}
