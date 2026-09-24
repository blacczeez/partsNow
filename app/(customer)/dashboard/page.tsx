import { CustomerHero } from '@/components/dashboard/customer-hero';
import { PopularCategories } from '@/components/dashboard/popular-categories';
import { PromoBanners } from '@/components/dashboard/promo-banners';
import { TrendingProducts } from '@/components/dashboard/trending-products';
import { getPartCategoriesWithCounts } from '@/lib/services/part-categories';

export default async function DashboardPage() {
  const rawCategories = await getPartCategoriesWithCounts().catch(() => []);
  const categories = rawCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    part_count: c.part_count,
  }));

  return (
    <div>
      <CustomerHero />
      <PopularCategories categories={categories} />
      <PromoBanners />
      <TrendingProducts />
    </div>
  );
}
