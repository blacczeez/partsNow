import { Inter } from 'next/font/google';

/** App-wide sans-serif (customer, runner, rider, auth, landing). Admin uses system `font-sans`. */
export const appFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-app',
});
