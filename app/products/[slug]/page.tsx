import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, ShieldCheck, Sparkles, Truck, RefreshCw } from 'lucide-react';
import { prisma } from '@/lib/db';
import ScentPyramid from '@/components/ScentPyramid';
import ProductCard from '@/components/ProductCard';
import ProductBuyActions from './ProductBuyActions';
import ProductReviews from '@/components/ProductReviews';

export const revalidate = 0; // Dynamic route for individual perfume

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
    },
    include: {
      reviews: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  let parsedImages: string[] = [];
  try {
    parsedImages = JSON.parse(product.images);
  } catch (e) {
    parsedImages = [product.images];
  }

  const primaryImage = parsedImages[0] || '/images/products/oud_nocturne.jpg';

  // Fetch 3 related products in same scent family
  const relatedProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      scentFamily: product.scentFamily,
      id: { not: product.id },
    },
    take: 3,
  });

  const formattedRelated = relatedProducts.map((prod) => {
    let images = [];
    try {
      images = JSON.parse(prod.images);
    } catch (e) {
      images = [prod.images];
    }
    return { ...prod, images };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16">
      {/* Breadcrumb Navigation */}
      <nav className="text-xs uppercase tracking-widest text-[#787063] flex items-center space-x-2">
        <Link href="/" className="hover:text-[#D4AF37]">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#D4AF37]">Car Perfumes</Link>
        <span>/</span>
        <span className="text-[#D4AF37] font-semibold">{product.name}</span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141210] border border-[#29241F] shadow-2xl">
            <Image
              src={primaryImage}
              alt={`${product.name} luxury car perfume bottle`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute top-4 left-4 bg-[#1A1815]/90 backdrop-blur-md border border-[#C5A059]/50 text-[#D4AF37] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded">
              {product.scentFamily}
            </div>
          </div>
        </div>

        {/* Right Column: Product Details & Purchase Form */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center text-[#D4AF37]">
                <Star className="w-4 h-4 fill-[#D4AF37]" />
                <span className="ml-1 font-bold text-[#FDFBF7]">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-[#787063]">&bull;</span>
              <span className="text-[#A0988E]">{product.reviewsCount} Discerning Reviews</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#FDFBF7] leading-tight">
              {product.name}
            </h1>

            {product.subtitle && (
              <p className="text-sm font-serif italic text-[#D4AF37]">
                {product.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed font-light pt-2">
              {product.description}
            </p>
          </div>

          {/* Pricing & Stock Banner */}
          <div className="p-4 bg-[#141210] border border-[#29241F] rounded-lg flex items-center justify-between">
            <div className="flex items-baseline space-x-3">
              <span className="font-serif text-3xl font-bold text-[#D4AF37]">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-[#787063] line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div>
              {product.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#2A9D8F] bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 px-3 py-1 rounded font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-pulse"></span>
                  In Stock ({product.stock} Vials)
                </span>
              ) : (
                <span className="text-xs text-[#E63946] bg-[#E63946]/10 border border-[#E63946]/30 px-3 py-1 rounded font-semibold uppercase tracking-wider">
                  Sold Out
                </span>
              )}
            </div>
          </div>

          {/* Client Interactive Buy Actions */}
          <ProductBuyActions
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: primaryImage,
              scentFamily: product.scentFamily,
              stock: product.stock,
            }}
          />

          {/* Value Props Strip */}
          <div className="grid grid-cols-2 gap-4 text-xs text-[#A0988E] pt-4 border-t border-[#29241F]">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-[#D4AF37]" />
              <span>Complimentary India Express Shipping</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
              <span>60-Day Fragrance Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scent Architecture Section */}
      <ScentPyramid
        topNotes={product.topNotes}
        heartNotes={product.heartNotes}
        baseNotes={product.baseNotes}
      />

      {/* Customer Reviews Section */}
      <ProductReviews
        productId={product.id}
        initialReviews={product.reviews}
        initialRating={product.rating}
        initialCount={product.reviewsCount}
      />

      {/* How to Use / Hanging Instructions */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-8 space-y-6">
        <h3 className="font-serif text-2xl font-bold text-[#FDFBF7] uppercase tracking-wider">
          Diffuser Care & Installation Instructions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#A0988E]">
          <div className="space-y-2 p-4 bg-[#1A1815] rounded-lg border border-[#29241F]">
            <div className="text-base font-serif font-bold text-[#D4AF37]">Step 01 &bull; Unplug Stopper</div>
            <p className="leading-relaxed">Unscrew the carved wooden cap and remove the protective inner plastic seal plug.</p>
          </div>
          <div className="space-y-2 p-4 bg-[#1A1815] rounded-lg border border-[#29241F]">
            <div className="text-base font-serif font-bold text-[#D4AF37]">Step 02 &bull; Invert Vial</div>
            <p className="leading-relaxed">Screw the wooden cap back on securely. Gently invert the bottle for 3 seconds to saturate the wooden lid with perfume oil.</p>
          </div>
          <div className="space-y-2 p-4 bg-[#1A1815] rounded-lg border border-[#29241F]">
            <div className="text-base font-serif font-bold text-[#D4AF37]">Step 03 &bull; Hang Gracefully</div>
            <p className="leading-relaxed">Adjust the black woven lanyard and hang from your rear-view mirror. Repeat inversion weekly for maximum scent intensity.</p>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {formattedRelated.length > 0 && (
        <div className="space-y-8 pt-8 border-t border-[#29241F]">
          <h3 className="font-serif text-3xl font-bold text-[#FDFBF7]">
            Complementary Car Perfumes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {formattedRelated.map((rel) => (
              <ProductCard key={rel.id} {...rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
