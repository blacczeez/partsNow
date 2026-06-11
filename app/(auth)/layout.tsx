import { AppFontShell } from '@/components/layout/app-font-shell';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFontShell className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </AppFontShell>
  );
}
