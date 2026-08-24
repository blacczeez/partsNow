import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

const LOGOS = {
  color: {
    src: '/images/brand/partsdey-logo.png',
    width: 1142,
    height: 282,
  },
  white: {
    src: '/images/brand/partsdey-logo-white.png',
    width: 1142,
    height: 282,
  },
} as const;

interface BrandLogoProps {
  variant?: keyof typeof LOGOS;
  className?: string;
  /** Display height in px; width scales from the source aspect ratio. */
  height?: number;
  href?: string;
  priority?: boolean;
}

export function BrandLogo({
  variant = 'color',
  className,
  height = 28,
  href = '/',
  priority = false,
}: BrandLogoProps) {
  const logo = LOGOS[variant];
  const width = Math.round((logo.width / logo.height) * height);

  const image = (
    <Image
      src={logo.src}
      alt="PartsDey"
      width={width}
      height={height}
      className={cn('h-auto w-auto', className)}
      style={{ height, width: 'auto' }}
      priority={priority}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="PartsDey home">
      {image}
    </Link>
  );
}
