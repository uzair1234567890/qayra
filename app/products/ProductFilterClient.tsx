'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';

interface ProductFilterClientProps {
  currentFamily: string;
  currentSort: string;
  currentSearch: string;
}

const SCENT_FAMILIES = ['All', 'Oud & Wood', 'Amber & Spice', 'Leather & Smoke', 'Fresh & Citrus'];

export default function ProductFilterClient({
  currentFamily,
  currentSort,
  currentSearch,
}: ProductFilterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'All' && value !== 'newest') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', search);
  };

  return (
    <div className="bg-[#141210] border border-[#29241F] rounded-xl p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Scent Family Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {SCENT_FAMILIES.map((family) => {
            const isActive = currentFamily === family || (family === 'All' && currentFamily === 'All');
            return (
              <button
                key={family}
                onClick={() => updateFilters('family', family)}
                className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#D4AF37] text-[#0A0908] shadow-lg font-bold'
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
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search scent notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] pl-9 pr-3 py-2 rounded focus:outline-none placeholder-[#787063]"
            />
            <Search className="w-4 h-4 text-[#787063] absolute left-3 top-2.5" />
          </form>

          {/* Sort Select */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
            <select
              value={currentSort}
              onChange={(e) => updateFilters('sort', e.target.value)}
              className="bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2 rounded focus:outline-none uppercase tracking-wider font-medium"
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
  );
}
