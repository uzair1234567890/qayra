'use client';

import React from 'react';
import Image from 'next/image';

interface CutoutPerfumeBottleProps {
  tiltAngle?: number;
}

export default function CutoutPerfumeBottle({ tiltAngle = 0 }: CutoutPerfumeBottleProps) {
  return (
    <div className="relative w-64 sm:w-72 h-80 sm:h-96 flex flex-col items-center select-none pointer-events-none drop-shadow-[0_25px_50px_rgba(212,175,55,0.35)]">
      {/* 1. Wooden Adjustment Bead on Cord */}
      <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#D4AF37] via-[#8C6D27] to-[#3A2A08] border border-[#FDFBF7]/30 shadow-lg z-30 flex items-center justify-center -mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#1A1815]" />
      </div>

      {/* 2. Real Product Bottle Display Frame with Premium Beveled Glass & Wood Cap */}
      <div className="relative w-56 sm:w-64 h-72 sm:h-80 rounded-2xl p-2 bg-[#141210]/60 backdrop-blur-md border border-[#D4AF37]/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-20 flex flex-col items-center justify-center overflow-hidden">
        
        {/* Soft Gold Backlight Glow */}
        <div className="absolute inset-0 bg-radial from-[#D4AF37]/20 via-transparent to-transparent blur-xl pointer-events-none" />

        {/* Real HD Product Image of Qayra Luxury Bottle */}
        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">
          <Image
            src="/images/products/shadow_elixir.jpg"
            alt="Qayra Luxury Car Perfume Bottle"
            fill
            priority
            className="object-cover object-center scale-105 hover:scale-110 transition-transform duration-700"
          />

          {/* Glass Specular Reflection Highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          
          {/* Subtle Outer Frame Border Accent */}
          <div className="absolute inset-0 border border-[#D4AF37]/30 rounded-xl pointer-events-none" />
        </div>

        {/* Floating Amber Liquid Shimmer Light Accent */}
        <div
          className="absolute bottom-4 inset-x-6 h-12 bg-gradient-to-t from-[#D4AF37]/20 to-transparent blur-md rounded-full pointer-events-none"
          style={{
            transform: `translateX(${tiltAngle * 0.8}px)`,
          }}
        />
      </div>
    </div>
  );
}
