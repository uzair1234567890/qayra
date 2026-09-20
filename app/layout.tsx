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
  description: 'Elevate your vehicle cabin with Qayra luxury hanging car perfumes. Handcrafted oud, amber, and leather fragrance diffusers with 30-day longevity.',
  keywords: ['car perfume', 'luxury car fragrance', 'hanging car perfume', 'car diffuser', 'oud car scent'],
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  verification: {
    google: 'H5TyTi43Ak-rOxIqufsfUXypof2wBNTdgIxPa-izLXU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark scroll-smooth ${serifFont.variable} ${sansFont.variable}`}>
      <head>
        <meta name="google-site-verification" content="H5TyTi43Ak-rOxIqufsfUXypof2wBNTdgIxPa-izLXU" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-JH86SYJ595" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-JH86SYJ595');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Qayra',
              legalName: 'Qayra Luxury Fragrances',
              url: 'https://qayra.in',
              logo: 'https://qayra.in/icon.png',
              description:
                'Indian luxury fragrance house crafting 10ml concentrated, non-alcoholic hanging car perfumes with handcrafted beechwood diffuser caps for 30+ day vehicle cabin longevity.',
              slogan: 'Crafted for the Discerning Drive',
              foundingLocation: 'India',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+91-9822929716',
                contactType: 'customer service',
                areaServed: 'IN',
                availableLanguage: ['en', 'hi'],
              },
            }),
          }}
        />
      </head>
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
