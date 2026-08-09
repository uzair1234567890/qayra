import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Flame, Compass, Star } from 'lucide-react';
import { prisma } from '@/lib/db';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
  const featuredProducts = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  const formattedProducts = featuredProducts.map((prod) => {
    let parsedImages = [];
    try {
      parsedImages = JSON.parse(prod.images);
    } catch (e) {
      parsedImages = [prod.images];
    }
    return { ...prod, images: parsedImages };
  });

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-4 sm:px-8 border-b border-[#29241F]">
        {/* Background Image / Gradient */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/products/oud_nocturne.jpg"
            alt="Qayra luxury car perfume background"
            fill
            priority
            className="object-cover opacity-25 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0908] via-transparent to-[#0A0908]" />
        </div>

        {/* Hero Content Box */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 pt-12">
          <div className="inline-flex items-center space-x-2 bg-[#1A1815]/80 backdrop-blur-md border border-[#C5A059]/40 px-4 py-1.5 rounded-full text-xs text-[#D4AF37] font-medium tracking-widest uppercase shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Oud & Ember Collection</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#FDFBF7] leading-[1.1]">
            Crafted for the <br />
            <span className="gold-gradient-text">Discerning Drive</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#B5AC9E] font-sans font-light leading-relaxed">
            Hanging car perfumes handcrafted with high-concentration essential oils, Cambodian agarwood, and Tuscan leather. Designed to transform your vehicle cabin into an sanctuary of quiet luxury for 60 days.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded hover:brightness-110 transition-all shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Explore Car Perfumes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="#philosophy"
              className="w-full sm:w-auto px-8 py-4 bg-[#141210] hover:bg-[#1A1815] border border-[#29241F] hover:border-[#D4AF37] text-[#FDFBF7] font-semibold text-xs uppercase tracking-[0.2em] rounded transition-all flex items-center justify-center space-x-2"
            >
              <span>The Qayra Ritual</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Philosophy Strip */}
      <section id="philosophy" className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                Olfactory Artistry
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7] leading-tight">
                Not Air Fresheners — <br />
                <span className="gold-gradient-text">Pure Fine Fragrance.</span>
              </h2>
              <p className="text-sm text-[#A0988E] leading-relaxed font-light">
                Standard automotive scents rely on synthetic aerosols that fade in days. Qayra approaches vehicle fragrancing as fine perfumery. Each hanging diffuser features a porous beechwood cap that absorbs concentrated oil, gently evaporating scent as air circulates naturally through your dashboard vents.
              </p>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#29241F]">
                <div>
                  <h4 className="font-serif text-2xl font-bold text-[#D4AF37]">60 Days</h4>
                  <p className="text-xs text-[#787063] uppercase tracking-wider mt-1">Continuous Diffusion</p>
                </div>
                <div>
                  <h4 className="font-serif text-2xl font-bold text-[#D4AF37]">0% Aerosol</h4>
                  <p className="text-xs text-[#787063] uppercase tracking-wider mt-1">Natural Wood Cap</p>
                </div>
              </div>
            </div>

            <div className="relative aspect-square rounded-xl overflow-hidden border border-[#29241F] shadow-2xl">
              <Image
                src="/images/products/amber_cedar.jpg"
                alt="Qayra handcrafted wood cap diffuser bottle"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-transparent to-transparent opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Scent Family Collections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.3em]">
            Curated Collections
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#FDFBF7]">
            Explore Scent Families
          </h2>
          <p className="text-xs sm:text-sm text-[#A0988E] max-w-lg mx-auto">
            Find the perfect atmosphere for your driving preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/products?family=Oud+%26+Wood"
            className="group relative h-80 rounded-xl overflow-hidden border border-[#29241F] p-6 flex flex-col justify-end transition-all hover:border-[#D4AF37]"
          >
            <Image
              src="/images/products/oud_nocturne.jpg"
              alt="Oud and wood fragrance family"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/40 to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Deep & Resinous</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">Oud & Wood</h3>
              <p className="text-xs text-[#A0988E] line-clamp-2">Smoked agarwood, rare sandalwood, and spiced balsam notes.</p>
            </div>
          </Link>

          <Link
            href="/products?family=Amber+%26+Spice"
            className="group relative h-80 rounded-xl overflow-hidden border border-[#29241F] p-6 flex flex-col justify-end transition-all hover:border-[#D4AF37]"
          >
            <Image
              src="/images/products/amber_cedar.jpg"
              alt="Amber and spice fragrance family"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/40 to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Warm & Enveloping</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">Amber & Spice</h3>
              <p className="text-xs text-[#A0988E] line-clamp-2">Golden Baltic amber, clove bud, and sweet Atlas cedar.</p>
            </div>
          </Link>

          <Link
            href="/products?family=Leather+%26+Smoke"
            className="group relative h-80 rounded-xl overflow-hidden border border-[#29241F] p-6 flex flex-col justify-end transition-all hover:border-[#D4AF37]"
          >
            <Image
              src="/images/products/leather_tobacco.jpg"
              alt="Leather and smoke fragrance family"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/40 to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Rich & Commanding</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">Leather & Smoke</h3>
              <p className="text-xs text-[#A0988E] line-clamp-2">Tuscan leather upholstery accord, tobacco blossom, and oakmoss.</p>
            </div>
          </Link>

          <Link
            href="/products?family=Fresh+%26+Citrus"
            className="group relative h-80 rounded-xl overflow-hidden border border-[#29241F] p-6 flex flex-col justify-end transition-all hover:border-[#D4AF37]"
          >
            <Image
              src="/images/products/sandalswood.jpg"
              alt="Fresh and citrus fragrance family"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/40 to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Crisp & Radiant</span>
              <h3 className="font-serif text-2xl font-bold text-[#FDFBF7]">Fresh & Citrus</h3>
              <p className="text-xs text-[#A0988E] line-clamp-2">Calabrian bergamot, neroli, and sun-drenched vetiver roots.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Bestsellers Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.3em]">
              Signature Selection
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7] mt-1">
              Bestselling Car Perfumes
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs text-[#D4AF37] hover:text-[#FDFBF7] font-semibold uppercase tracking-widest flex items-center gap-1 group"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {formattedProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </section>
    </div>
  );
}
