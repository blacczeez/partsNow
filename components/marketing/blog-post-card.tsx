import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';
import { formatShortDate } from '@/lib/utils/format';

export function BlogPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group rounded-card border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Cover image or placeholder gradient */}
      <div className="aspect-[16/9] w-full overflow-hidden rounded-t-card bg-gradient-to-br from-primary/20 to-primary/5" />

      <div className="p-5">
        <h2 className="text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-primary">
          {post.title}
        </h2>
        <p className="mt-2 text-sm text-slate-500 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{formatShortDate(post.date)}</span>
          <span>{post.author}</span>
        </div>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
