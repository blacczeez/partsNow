import type { Metadata } from 'next';
import { getAllPosts, getAllTags } from '@/lib/blog';
import { BlogPostCard } from '@/components/marketing/blog-post-card';
import { BlogTagFilter } from '@/components/marketing/blog-tag-filter';

export const metadata: Metadata = {
  title: 'Blog | PartsDey',
  description:
    'Tips, guides, and stories about spare parts sourcing, delivery, and the Lagos mechanic community.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const allPosts = getAllPosts();
  const allTags = getAllTags();

  const posts = tag
    ? allPosts.filter((p) => p.tags.includes(tag))
    : allPosts;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Blog</h1>
          <p className="mt-3 text-lg text-blue-100">
            Tips, guides, and stories from the spare parts frontline.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {/* Tag filter */}
          <div className="mb-8">
            <BlogTagFilter tags={allTags} activeTag={tag} />
          </div>

          {posts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500">
              No posts found{tag ? ` for tag "${tag}"` : ''}.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
