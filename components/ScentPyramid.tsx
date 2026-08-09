'use client';

import React from 'react';
import { Wind, Heart, ShieldCheck } from 'lucide-react';

interface ScentPyramidProps {
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
}

export default function ScentPyramid({ topNotes, heartNotes, baseNotes }: ScentPyramidProps) {
  return (
    <div className="bg-[#141210] border border-[#29241F] rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#29241F] pb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#FDFBF7] uppercase tracking-wider">
            Olfactory Scent Architecture
          </h3>
          <p className="text-xs text-[#787063] mt-0.5">
            Three-tier fragrance evolution released through natural wooden diffusion cap.
          </p>
        </div>
        <span className="text-xs text-[#D4AF37] font-serif italic border border-[#C5A059]/40 px-3 py-1 rounded bg-[#1A1815]">
          Oud & Ember Formula
        </span>
      </div>

      <div className="space-y-4">
        {/* Top Notes */}
        <div className="relative pl-6 border-l-2 border-[#D4AF37] bg-[#1A1815]/60 p-4 rounded-r-lg">
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            <Wind className="w-4 h-4 text-[#D4AF37]" />
            <span>Top Notes &bull; Initial Impression (First 15 Mins)</span>
          </div>
          <p className="text-sm font-serif text-[#FDFBF7] mt-1 font-medium">{topNotes}</p>
          <p className="text-[11px] text-[#787063] mt-1">
            Crisp opening notes that greet you immediately upon entering the vehicle cabin.
          </p>
        </div>

        {/* Heart Notes */}
        <div className="relative pl-6 border-l-2 border-[#C5A059] bg-[#1A1815]/60 p-4 rounded-r-lg">
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#C5A059] font-semibold">
            <Heart className="w-4 h-4 text-[#C5A059]" />
            <span>Heart Notes &bull; Core Identity (15 Mins - 4 Hours)</span>
          </div>
          <p className="text-sm font-serif text-[#FDFBF7] mt-1 font-medium">{heartNotes}</p>
          <p className="text-[11px] text-[#787063] mt-1">
            The soulful body of the fragrance that defines your vehicle’s ambient character.
          </p>
        </div>

        {/* Base Notes */}
        <div className="relative pl-6 border-l-2 border-[#A38220] bg-[#1A1815]/60 p-4 rounded-r-lg">
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#A38220] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#A38220]" />
            <span>Base Notes &bull; Lasting Resonance (Up to 60 Days)</span>
          </div>
          <p className="text-sm font-serif text-[#FDFBF7] mt-1 font-medium">{baseNotes}</p>
          <p className="text-[11px] text-[#787063] mt-1">
            Deep amber, oud, and rich woods that linger long into the fabric and leather upholstery.
          </p>
        </div>
      </div>
    </div>
  );
}
