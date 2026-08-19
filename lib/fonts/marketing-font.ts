import { Inter, Work_Sans } from 'next/font/google';

/** Marketing chrome (landing header/footer/sections). 400, 500, 600 match Figma. */
export const marketingFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const workSans = Work_Sans({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

