import React from 'react';
import { prisma } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import ProductFilterClient from './ProductFilterClient';

export const revalidate = 0; // Dynamic fetch for catalog filters

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

  const where: any = { isActive: true };

  if (family && family !== 'All') {
    where.scentFamily = family;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { scentFamily: { contains: search } },
      { topNotes: { contains: search } },
    ];
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price-asc') orderBy = { price: 'asc' };
  if (sort === 'price-desc') orderBy = { price: 'desc' };
  if (sort === 'rating') orderBy = { rating: 'desc' };

  const products = await prisma.product.findMany({
    where,
    orderBy,
  });

  const formattedProducts = products.map((prod) => {
    let parsedImages = [];
    try {
      parsedImages = JSON.parse(prod.images);
    } catch (e) {
      parsedImages = [prod.images];
    }
    return { ...prod, images: parsedImages };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      {/* Page Title Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.3em]">
          The Qayra Vault
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#FDFBF7]">
          Hanging Car Perfumes
        </h1>
        <p className="text-xs sm:text-sm text-[#A0988E]">
          Explore our complete collection of handcrafted car fragrance diffusers. Concentrated oils blended for 60-day vehicle cabin diffusion.
        </p>
      </div>

      {/* Interactive Filters & Search */}
      <ProductFilterClient
        currentFamily={family || 'All'}
        currentSort={sort || 'newest'}
        currentSearch={search || ''}
      />

      {/* Products Grid */}
      {formattedProducts.length === 0 ? (
        <div className="text-center py-24 bg-[#141210] border border-[#29241F] rounded-xl p-8 space-y-4">
          <p className="font-serif text-2xl text-[#FDFBF7]">No car perfumes match your search.</p>
          <p className="text-xs text-[#787063]">Try clearing your search query or selecting another scent family.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {formattedProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
