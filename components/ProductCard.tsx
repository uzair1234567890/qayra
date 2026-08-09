'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star, Sparkles } from 'lucide-react';
import { useCart } from './CartContext';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  scentFamily: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  stock: number;
  rating?: number;
  reviewsCount?: number;
  topNotes?: string;
}

export default function ProductCard({
  id,
  name,
  slug,
  subtitle,
  scentFamily,
  price,
  originalPrice,
  images,
  stock,
  rating = 4.9,
  reviewsCount = 28,
  topNotes,
}: ProductCardProps) {
  const { addToCart } = useCart();

  const primaryImage = images && images.length > 0 ? images[0] : '/images/products/oud_nocturne.jpg';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id,
      slug,
      name,
      price,
      image: primaryImage,
      scentFamily,
    });
  };

  return (
    <div className="group relative bg-[#141210] border border-[#29241F] hover:border-[#C5A059]/60 rounded-lg overflow-hidden transition-all duration-500 flex flex-col justify-between hover:shadow-2xl">
      <Link href={`/products/${slug}`} className="block relative aspect-square overflow-hidden bg-[#0A0908]">
        {/* Product Tag Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col space-y-1">
          <span className="bg-[#1A1815]/90 backdrop-blur-md text-[#D4AF37] border border-[#C5A059]/40 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-semibold">
            {scentFamily}
          </span>
        </div>

        {/* Low Stock Indicator */}
        {stock > 0 && stock <= 15 && (
          <div className="absolute top-3 right-3 z-10 bg-[#E69A28]/20 border border-[#E69A28]/50 text-[#E69A28] text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-bold">
            Only {stock} Left
          </div>
        )}

        {/* Product Photography */}
        <Image
          src={primaryImage}
          alt={`${name} luxury car perfume bottle`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
      </Link>

      {/* Product Information Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-[#D4AF37] text-xs space-x-1">
              <Star className="w-3.5 h-3.5 fill-[#D4AF37]" />
              <span className="font-semibold text-xs text-[#FDFBF7]">{rating.toFixed(1)}</span>
              <span className="text-[#787063] text-[10px]">({reviewsCount})</span>
            </div>
            <span className="text-[10px] text-[#A0988E] uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" /> 60-Day Release
            </span>
          </div>

          <Link href={`/products/${slug}`} className="block">
            <h3 className="font-serif text-xl font-bold text-[#FDFBF7] group-hover:text-[#D4AF37] transition-colors leading-tight">
              {name}
            </h3>
          </Link>

          {subtitle && (
            <p className="text-xs text-[#A0988E] line-clamp-1 italic font-serif">
              {subtitle}
            </p>
          )}

          {topNotes && (
            <p className="text-[11px] text-[#787063] line-clamp-1">
              <span className="text-[#C5A059] font-medium">Notes:</span> {topNotes}
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-3 border-t border-[#29241F] flex items-center justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="font-serif text-lg font-bold text-[#D4AF37]">
              ₹{price.toLocaleString('en-IN')}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-[#787063] line-through">
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={stock <= 0}
            className="px-3.5 py-2 bg-[#1A1815] hover:bg-[#D4AF37] border border-[#29241F] hover:border-[#D4AF37] text-[#FDFBF7] hover:text-[#0A0908] rounded text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Add car perfume to cart"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{stock > 0 ? 'Add' : 'Sold Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
