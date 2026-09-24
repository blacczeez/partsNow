import { Fragment } from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="relative left-1/2 -ml-[50vw] w-screen bg-[#F2F4F5]">
      <div className="mx-auto max-w-7xl px-4 lg:px-1">
        <div className="flex items-center gap-1.5 py-3 text-sm">
          {items.map((item, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span className="text-[#77878F]">&rsaquo;</span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[#A3A3A3] hover:text-slate-600"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-[#0A0A0A]">{item.label}</span>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </nav>
  );
}
