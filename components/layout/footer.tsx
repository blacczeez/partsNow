import type { ReactNode } from 'react';
import Link from 'next/link';
import { marketingFont } from '@/lib/fonts/marketing-font';
import { cn } from '@/lib/utils/cn';
import { MarketingCanvas, MARKETING_GUTTER_CLASS } from '@/components/layout/marketing-canvas';
import { BrandLogo } from '@/components/layout/brand-logo';

const productLinks = [
  { href: '/search?category=engine', label: 'Engine Parts' },
  { href: '/search?category=brakes', label: 'Brake Systems' },
  { href: '/search?category=suspension', label: 'Suspension' },
  { href: '/search?category=electrical', label: 'Electrical Components' },
  { href: '/search?category=cooling', label: 'Cooling Systems' },
];

const companyLinks = [
  { href: '#', label: 'About Us' },
  { href: '/#markets', label: 'Our Suppliers' },
  { href: '/blog', label: 'News & Updates' },
  { href: '#', label: 'Contact' },
  { href: '#', label: 'Become a Partner' },
];

const resourceLinks = [
  { href: '#', label: 'Help Center' },
  { href: '#', label: 'Shipping Information' },
  { href: '#', label: 'Returns & Refunds' },
  { href: '#', label: 'Warranty Information' },
  { href: '/#faq', label: 'FAQs' },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="flex flex-col items-start gap-7">
      <p className="text-sm font-bold leading-5 tracking-[-0.01em] text-[#FFF]">
        {title}
      </p>
      <ul className="flex flex-col items-start gap-4">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm leading-5 tracking-[-0.01em] text-[#EBEBEB] transition-opacity hover:opacity-80"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center text-[#F7F7F7] transition-opacity hover:opacity-80"
    >
      {children}
    </a>
  );
}

export function Footer({ overlapCta = false }: { overlapCta?: boolean }) {
  return (
    <footer
      className={cn(
        marketingFont.className,
        overlapCta && 'relative z-0 -mt-[85px] min-[1032px]:-mt-[176px]'
      )}
      style={{
        background: 'linear-gradient(0deg, #080217 0%, #1E0560 100%)',
      }}
    >
      <div className="relative">
        <MarketingCanvas
          className={cn(
            'relative flex flex-col items-center gap-[62px] pb-8',
            MARKETING_GUTTER_CLASS,
            overlapCta ? 'pt-28 sm:pt-[221px]' : 'pt-20 sm:pt-[120px]'
          )}
        >
          <div className="flex w-full flex-col justify-between gap-12 lg:flex-row lg:items-start lg:gap-[168px]">
            <div className="flex w-full max-w-[380px] flex-col items-start gap-9">
              <BrandLogo variant="white" height={36} />

              <div className="flex w-full flex-col items-start gap-3">
                <p className="text-sm sm:text-sm leading-5 tracking-[-0.01em] text-[#FFF]">
                  Keeping trucks moving with reliable parts, trusted suppliers,
                  and fast nationwide delivery.
                </p>
                <div className="flex items-center justify-center gap-[21px]">
                  <SocialIcon label="Facebook" href="#">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H6v4h3v8h4v-8h3.2L17 11h-4V9c0-.6.4-1 1-1Z" />
                    </svg>
                  </SocialIcon>
                  <SocialIcon label="X" href="#">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M17.3 3h3.1l-6.8 7.8L22 21h-6.2l-4.8-6.3L5.4 21H2.3l7.3-8.3L2 3h6.4l4.4 5.8L17.3 3Zm-1.1 16.2h1.7L7.9 4.7H6.1l10.1 14.5Z" />
                    </svg>
                  </SocialIcon>
                  <SocialIcon label="Instagram" href="#">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm10.2 1.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 8.5A3.5 3.5 0 1 1 12 15.5 3.5 3.5 0 0 1 12 8.5Z" />
                    </svg>
                  </SocialIcon>
                  <SocialIcon label="TikTok" href="#">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M14 3c.4 2.6 1.8 4.4 4.5 4.7v3.1c-1.5 0-2.9-.5-4.1-1.3v6.2c0 3.3-2.6 5.8-6.2 5.3-2.5-.3-4.4-2.3-4.6-4.8-.3-3.4 2.4-6.3 5.8-6.3.5 0 1 .1 1.5.2v3.2c-.4-.2-.9-.3-1.4-.2-1.4.2-2.4 1.5-2.2 2.9.2 1.3 1.4 2.3 2.7 2.3 1.4 0 2.5-1.1 2.5-2.5V3H14Z" />
                    </svg>
                  </SocialIcon>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-start gap-10 sm:gap-16 lg:w-[585px] lg:flex-nowrap lg:gap-16">
              <FooterColumn title="Products" links={productLinks} />
              <FooterColumn title="Company" links={companyLinks} />
              <FooterColumn title="Resources" links={resourceLinks} />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-[53px]">
            <div
              className="h-px w-full"
              style={{ backgroundColor: '#302F2F', opacity: 0.82 }}
            />
            <p className="w-full text-center text-base leading-[19px] text-white/65">
              &copy; {new Date().getFullYear()} PartsDey. All rights reserved.
            </p>
          </div>
        </MarketingCanvas>
      </div>
    </footer>
  );
}
