import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-6">
      <div className="p-4 bg-[#1A1815] border border-[#C5A059]/40 rounded-full text-[#D4AF37]">
        <Compass className="w-12 h-12 stroke-[1.5]" />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">404 Error</span>
        <h1 className="font-serif text-4xl font-bold text-[#FDFBF7]">Fragrance Path Not Found</h1>
        <p className="text-xs text-[#A0988E] max-w-sm mx-auto leading-relaxed">
          The perfume page or scent collection you are seeking is unavailable or has moved.
        </p>
      </div>

      <Link
        href="/products"
        className="inline-flex items-center space-x-2 px-6 py-3 bg-[#D4AF37] text-[#0A0908] text-xs font-bold uppercase tracking-widest rounded hover:brightness-110 transition-all shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return To Car Perfume Catalog</span>
      </Link>
    </div>
  );
}
