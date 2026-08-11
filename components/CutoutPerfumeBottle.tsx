'use client';

import React, { useState, useEffect } from 'react';

interface CutoutPerfumeBottleProps {
  tiltAngle?: number;
}

export default function CutoutPerfumeBottle({ tiltAngle = 0 }: CutoutPerfumeBottleProps) {
  const [waveOffset, setWaveOffset] = useState(0);

  // Smooth liquid wave animation loop
  useEffect(() => {
    let animId: number;
    let time = 0;

    const animateWave = () => {
      time += 0.06;
      setWaveOffset(time);
      animId = requestAnimationFrame(animateWave);
    };

    animateWave();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Liquid surface counter-rotates against bottle tilt to simulate real fluid gravity
  const liquidTilt = -tiltAngle * 0.85;

  // Wave points for smooth sine wave liquid surface
  const waveHeight = 6;
  const w1 = Math.sin(waveOffset * 1.5) * waveHeight;
  const w2 = Math.cos(waveOffset * 1.8) * waveHeight;
  const w3 = Math.sin(waveOffset * 2.1) * waveHeight;

  // Dynamic SVG Path for fluid liquid wave surface
  const liquidWavePath = `
    M 0 ${35 + w1}
    Q 50 ${35 + w2}, 100 ${35 + w3}
    Q 150 ${35 - w1}, 200 ${35 + w2}
    L 200 160
    L 0 160
    Z
  `;

  return (
    <div className="relative w-56 sm:w-64 h-72 sm:h-80 flex flex-col items-center select-none pointer-events-none drop-shadow-[0_20px_45px_rgba(212,175,55,0.4)]">
      {/* 1. Wooden Adjustment Bead on Cord */}
      <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#D4AF37] via-[#8C6D27] to-[#3A2A08] border border-[#FDFBF7]/40 shadow-lg z-40 flex items-center justify-center -mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#1A1815]" />
      </div>

      {/* 2. Beechwood Wooden Cap (Engraved QAYRA Logo) */}
      <div className="relative w-28 sm:w-32 h-20 sm:h-24 bg-gradient-to-b from-[#C5A059] via-[#A88238] to-[#6E501A] rounded-xl border-2 border-[#D4AF37]/90 shadow-2xl flex flex-col items-center justify-center p-3 z-30 overflow-hidden">
        {/* Natural Wood Grain Striations */}
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,transparent_20%,rgba(0,0,0,0.8)_50%,transparent_80%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)]" />
        
        {/* Engraved Wood Emblem */}
        <div className="relative z-10 text-center space-y-0.5">
          <span className="font-serif font-bold text-xs sm:text-sm tracking-[0.25em] text-[#2C1F08] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)] block uppercase">
            QAYRA
          </span>
          <span className="font-serif font-semibold text-[9px] tracking-[0.2em] text-[#3D2C0D] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)] block uppercase">
            CAR PERFUME
          </span>
        </div>

        {/* Polished Gold Base Ring */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-[#C5A059] via-[#FDFBF7] to-[#C5A059] border-t border-white/40" />
      </div>

      {/* 3. Gold Metallic Neck Collar */}
      <div className="w-16 sm:w-20 h-3 bg-gradient-to-r from-[#8C6D27] via-[#F5E6B4] to-[#8C6D27] z-25 border-x-2 border-[#D4AF37] shadow-md" />

      {/* 4. Crystal Glass Bottle Container (Pure Cutout Contour) */}
      <div className="relative w-48 sm:w-56 h-48 sm:h-56 rounded-b-[2rem] rounded-t-lg border-3 border-[#D4AF37] bg-[#0A0908]/30 backdrop-blur-sm overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-20 flex flex-col justify-end">
        
        {/* Dynamic Fluid Liquid Container (Waving Wave Surface) */}
        <div className="absolute inset-0 z-0 overflow-hidden flex items-end justify-center pointer-events-none">
          <div
            className="relative w-[140%] h-[140%] -bottom-6 transition-transform duration-100 ease-out"
            style={{
              transform: `rotate(${liquidTilt}deg)`,
              transformOrigin: '50% 60%',
            }}
          >
            {/* SVG Waving Amber Perfume Liquid */}
            <svg
              viewBox="0 0 200 160"
              preserveAspectRatio="none"
              className="w-full h-full text-[#D4AF37]"
            >
              <defs>
                <linearGradient id="amberLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F5E6B4" stopOpacity="0.95" />
                  <stop offset="20%" stopColor="#D4AF37" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#C5A059" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#523B0F" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="waveSurfaceGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#FDFBF7" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Liquid Body with Dynamic Wave Surface */}
              <path d={liquidWavePath} fill="url(#amberLiquidGrad)" />

              {/* Glowing Wave Surface Line */}
              <path
                d={`M 0 ${35 + w1} Q 50 ${35 + w2}, 100 ${35 + w3} Q 150 ${35 - w1}, 200 ${35 + w2}`}
                fill="none"
                stroke="url(#waveSurfaceGlow)"
                strokeWidth="3.5"
              />
            </svg>
          </div>
        </div>

        {/* Glass Specular Light Reflection & Shimmer Lines */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent z-10 pointer-events-none" />
        <div className="absolute top-2 left-3 w-1.5 h-36 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-full z-10 pointer-events-none" />
        <div className="absolute top-2 right-3 w-1 h-28 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-full z-10 pointer-events-none" />

        {/* 5. Luxury Gold QAYRA Label Placed On Bottle Front */}
        <div className="relative z-20 mx-auto mb-6 px-4 py-2 bg-[#0A0908]/80 backdrop-blur-md border border-[#D4AF37] rounded-lg text-center shadow-xl max-w-[75%]">
          <span className="font-serif font-bold text-xs sm:text-sm tracking-[0.25em] text-[#D4AF37] block uppercase">
            QAYRA
          </span>
          <span className="font-sans text-[8px] tracking-[0.2em] text-[#A0988E] block uppercase mt-0.5">
            OUD NOCTURNE
          </span>
        </div>
      </div>
    </div>
  );
}
