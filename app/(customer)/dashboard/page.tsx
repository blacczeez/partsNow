import { CustomerHero } from '@/components/dashboard/customer-hero';
import { PopularCategories } from '@/components/dashboard/popular-categories';
import { PromoBanners } from '@/components/dashboard/promo-banners';
import { TrendingProducts } from '@/components/dashboard/trending-products';

export default function DashboardPage() {
  return (
    <div>
      <CustomerHero />
      <PopularCategories />
      <PromoBanners />
      <TrendingProducts />
    </div>
  );
}
