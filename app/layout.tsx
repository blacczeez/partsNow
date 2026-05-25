import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'PartsNow - Spare Parts Delivery',
  description: 'Get spare parts delivered in 45 minutes in Lagos',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
