'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

interface ProductItem {
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
  createdAt?: Date | string;
}

interface ProductFilterClientProps {
  initialProducts: ProductItem[];
  allProducts: ProductItem[];
  currentFamily: string;
  currentSort: string;
  currentSearch: string;
}

const SCENT_FAMILIES = ['All', 'Oud & Wood', 'Amber & Spice', 'Leather & Smoke', 'Fresh & Citrus'];

export default function ProductFilterClient({
  initialProducts,
  allProducts,
  currentFamily,
  currentSort,
  currentSearch,
}: ProductFilterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeFamily, setActiveFamily] = useState(currentFamily);
  const [activeSort, setActiveSort] = useState(currentSort);
  const [search, setSearch] = useState(currentSearch);

  // Compute zero-latency reactive products list
  const displayedProducts = useMemo(() => {
    let list = [...(allProducts && allProducts.length > 0 ? allProducts : initialProducts)];

    if (activeFamily && activeFamily !== 'All') {
      list = list.filter((p) => p.scentFamily === activeFamily);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.scentFamily.toLowerCase().includes(q) ||
          (p.topNotes && p.topNotes.toLowerCase().includes(q))
      );
    }

    if (activeSort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (activeSort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (activeSort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return list;
  }, [allProducts, initialProducts, activeFamily, search, activeSort]);

  const updateFilters = (key: string, value: string) => {
    if (key === 'family') setActiveFamily(value);
    if (key === 'sort') setActiveSort(value);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'All' && value !== 'newest') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/products?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val.trim()) {
        params.set('search', val.trim());
      } else {
        params.delete('search');
      }
      router.push(`/products?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-10">
      {/* Controls Container */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-4 sm:p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Scent Family Filter Chips (Mobile Horizontal Scrollable Touch List) */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar flex-nowrap snap-x py-1">
            {SCENT_FAMILIES.map((family) => {
              const isActive = activeFamily === family;
              return (
                <button
                  key={family}
                  onClick={() => updateFilters('family', family)}
                  className={`px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 snap-start active:scale-95 ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0A0908] shadow-lg font-bold scale-105'
                      : 'bg-[#1A1815] text-[#B5AC9E] border border-[#29241F] hover:border-[#D4AF37] hover:text-[#FDFBF7]'
                  }`}
                >
                  {family}
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Instant Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search scent notes..."
                value={search}
                onChange={handleSearchChange}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] pl-9 pr-3 py-2 rounded focus:outline-none placeholder-[#787063] transition-colors"
              />
              <Search className="w-4 h-4 text-[#787063] absolute left-3 top-2.5" />
            </div>

            {/* Instant Sort Dropdown */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
              <select
                value={activeSort}
                onChange={(e) => updateFilters('sort', e.target.value)}
                className="bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2 rounded focus:outline-none uppercase tracking-wider font-medium cursor-pointer"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reactive Products Grid */}
      {displayedProducts.length === 0 ? (
        <div className="text-center py-24 bg-[#141210] border border-[#29241F] rounded-xl p-8 space-y-4">
          <p className="font-serif text-2xl text-[#FDFBF7]">No car perfumes match your search.</p>
          <p className="text-xs text-[#787063]">Try clearing your search query or selecting another scent family.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
