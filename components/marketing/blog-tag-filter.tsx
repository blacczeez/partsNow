import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface BlogTagFilterProps {
  tags: string[];
  activeTag?: string;
}

export function BlogTagFilter({ tags, activeTag }: BlogTagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/blog"
        scroll={false}
        className={cn(
          'rounded-pill px-3 py-1 text-sm font-medium transition-colors',
          !activeTag
            ? 'bg-primary text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        )}
      >
        All
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog?tag=${encodeURIComponent(tag)}`}
          scroll={false}
          className={cn(
            'rounded-pill px-3 py-1 text-sm font-medium transition-colors',
            activeTag === tag
              ? 'bg-primary text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
