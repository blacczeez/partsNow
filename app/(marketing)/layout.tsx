import { MarketingNav } from '@/components/layout/marketing-nav';
import { Footer } from '@/components/layout/footer';
import { AppFontShell } from '@/components/layout/app-font-shell';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFontShell className="min-h-screen">
      <MarketingNav variant="solid" />
      <main>{children}</main>
      <Footer />
    </AppFontShell>
  );
}
