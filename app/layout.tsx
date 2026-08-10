import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';

const serifFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Qayra | Luxury Car Fragrance & Hanging Car Perfumes',
  description: 'Elevate your vehicle cabin with Qayra luxury hanging car perfumes. Handcrafted oud, amber, and leather fragrance diffusers with 40-day longevity.',
  keywords: ['car perfume', 'luxury car fragrance', 'hanging car perfume', 'car diffuser', 'oud car scent'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark scroll-smooth ${serifFont.variable} ${sansFont.variable}`}>
      <body className="bg-[#0A0908] text-[#FDFBF7] antialiased selection:bg-[#D4AF37] selection:text-[#0A0908]">
        <CartProvider>
          <div className="min-h-screen flex flex-col justify-between">
            <HeaderBanner />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
