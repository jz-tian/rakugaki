import type { Metadata } from 'next';
import { Shippori_Mincho_B1, DM_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const shippori = Shippori_Mincho_B1({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-shippori',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '落書き — AI Drawing Judge',
  description: 'Draw anything. Get judged by AI. Level up or try again.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${shippori.variable} ${dmSans.variable} ${cormorant.variable}`}>
      <body className="bg-[oklch(96.5%_0.012_74)] text-[oklch(13%_0.018_258)] antialiased">
        {children}
      </body>
    </html>
  );
}
