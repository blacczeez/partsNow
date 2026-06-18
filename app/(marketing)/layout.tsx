import { MarketingNav } from '@/components/layout/marketing-nav';
import { Footer } from '@/components/layout/footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <MarketingNav variant="solid" />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
