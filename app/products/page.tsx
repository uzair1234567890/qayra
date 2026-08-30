import React from 'react';
import type { Metadata } from 'next';
import { getCachedProducts } from '@/lib/products';
import ProductCard from '@/components/ProductCard';
import ProductFilterClient from './ProductFilterClient';
import GiftBundleSection from '@/components/GiftBundleSection';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Luxury Hanging Car Perfumes Online India | Qayra',
  description: 'Shop luxury hanging car perfumes online at Qayra. Long-lasting oud, musk & sandalwood car fragrances, non-alcoholic, spill-free — 30-day longevity. Free shipping across India.',
  keywords: ['hanging car perfume', 'car perfume online India', 'luxury car perfume', 'oud car perfume', 'non-alcoholic car perfume', 'car fragrance', 'Qayra'],
};

interface ProductsPageProps {
  searchParams: Promise<{
    family?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const family = resolvedSearchParams.family;
  const search = resolvedSearchParams.search;
  const sort = resolvedSearchParams.sort;

  // Fetch cached active products with sub-20ms RAM speed
  const allProducts = await getCachedProducts({ isActive: true }, { createdAt: 'desc' });

  // Apply server initial filter
  let filtered = [...allProducts];
  if (family && family !== 'All') {
    filtered = filtered.filter((p) => p.scentFamily === family);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.scentFamily.toLowerCase().includes(q) ||
        (p.topNotes && p.topNotes.toLowerCase().includes(q))
    );
  }
  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      {/* Page Title Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.3em]">
          The Qayra Vault
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#FDFBF7]">
          Luxury Hanging Car Perfumes Online India
        </h1>
        <p className="text-xs sm:text-sm text-[#A0988E]">
          Shop Qayra's complete collection of non-alcoholic, spill-free hanging car perfumes. Long-lasting oud, musk & sandalwood car fragrances with 30-day diffusion.
        </p>
      </div>

      {/* Interactive Filters & Search */}
      <ProductFilterClient
        initialProducts={filtered}
        allProducts={allProducts}
        currentFamily={family || 'All'}
        currentSort={sort || 'newest'}
        currentSearch={search || ''}
      />

      {/* Luxury Gift Bundle Offer */}
      <div className="pt-8 border-t border-[#29241F]">
        <GiftBundleSection />
      </div>
    </div>
  );
}
