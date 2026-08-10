'use client';

import React, { useState, useEffect } from 'react';

interface CutoutPerfumeBottleProps {
  tiltAngle?: number;
}

export default function CutoutPerfumeBottle({ tiltAngle = 0 }: CutoutPerfumeBottleProps) {
  const [wavePhase, setWavePhase] = useState(0);

  useEffect(() => {
    let animId: number;
    let time = 0;

    const animateLiquid = () => {
      time += 0.08;
      setWavePhase(time);
      animId = requestAnimationFrame(animateLiquid);
    };

    animateLiquid();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Liquid remains aligned with gravity horizon (-tiltAngle)
  const CounterRotation = -tiltAngle;
  const waveAmplitude = Math.sin(wavePhase) * 3 + Math.sin(tiltAngle * 0.1) * 2;

  return (
    <div className="relative w-52 sm:w-64 h-72 sm:h-80 flex flex-col items-center select-none pointer-events-none drop-shadow-[0_30px_60px_rgba(212,175,55,0.45)]">
      
      {/* 1. Wooden Adjustment Bead on Cord */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#C5A059] via-[#8C6D27] to-[#543D0F] border border-[#D4AF37] shadow-md z-30 flex items-center justify-center -mb-1">
        <div className="w-2 h-2 rounded-full bg-[#1A1815]" />
      </div>

      {/* 2. Square Natural Beechwood Cap (Matching Aroma Therapie / Qayra Engraved Wood Cap) */}
      <div className="relative w-24 sm:w-28 h-20 sm:h-24 bg-gradient-to-b from-[#B59345] via-[#C5A059] to-[#7A5A1C] rounded-lg border-2 border-[#D4AF37]/80 shadow-2xl flex flex-col items-center justify-center p-2 z-30 overflow-hidden">
        {/* Wood Grain Texture Lines */}
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,transparent_30%,rgba(0,0,0,0.85)_50%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(0deg,transparent_40%,rgba(255,255,255,0.4)_50%,transparent_60%)]" />
        
        {/* Engraved Wood Text */}
        <div className="relative z-10 text-center space-y-0.5">
          <span className="font-serif font-bold text-xs sm:text-sm tracking-[0.2em] text-[#3D2C0D] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] block uppercase">
            AROMA
          </span>
          <span className="font-serif font-bold text-[10px] sm:text-xs tracking-[0.25em] text-[#3D2C0D] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] block uppercase">
            THERAPIE
          </span>
        </div>

        {/* Polished Gold Base Ring */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-[#C5A059] via-[#F5E6B4] to-[#C5A059] border-t border-white/40" />
      </div>

      {/* 3. Gold Metallic Collar */}
      <div className="w-16 sm:w-20 h-2.5 bg-gradient-to-r from-[#8C6D27] via-[#F5E6B4] to-[#8C6D27] z-25 shadow-lg border-x-2 border-[#D4AF37]" />

      {/* 4. Heavy Crystal Glass Bottle Body */}
      <div className="relative w-44 sm:w-56 h-52 sm:h-60 rounded-b-3xl rounded-t-sm border-3 border-[#D4AF37] bg-[#0A0908]/40 backdrop-blur-md overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.95)] z-20 flex flex-col justify-end p-4">
        
        {/* GRAVITY-ALIGNED FLUID LIQUID CONTAINER */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-end justify-center">
          <div
            className="relative w-[180%] h-[180%] -bottom-8 flex flex-col justify-end items-center transition-transform duration-75 ease-out"
            style={{
              transform: `rotate(${CounterRotation}deg)`,
              transformOrigin: '50% 65%',
            }}
          >
            {/* Golden Amber Perfume Liquid */}
            <div className="relative w-full h-[68%] bg-gradient-to-t from-[#523B0F] via-[#C5A059] to-[#D4AF37] opacity-95">
              
              {/* Dynamic Fluid Meniscus Surface Wave */}
              <div
                className="absolute -top-3 inset-x-0 h-6 bg-gradient-to-r from-[#F5E6B4] via-[#FFFFFF] to-[#F5E6B4] opacity-90 shadow-md transition-transform duration-75"
                style={{
                  transform: `translateY(${waveAmplitude}px)`,
                  clipPath: 'ellipse(50% 40% at 50% 50%)',
                }}
              />

              {/* Surface Golden Glow Meniscus */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-[#FFFFFF]/60 shadow-[0_0_12px_#D4AF37]" />

              {/* Essential Oil Rising Bubbles */}
              <div className="absolute bottom-4 left-1/4 w-2 h-2 rounded-full bg-[#F5E6B4]/80 blur-[0.5px] animate-bounce" />
              <div className="absolute bottom-8 right-1/3 w-1.5 h-1.5 rounded-full bg-[#FFFFFF]/90 blur-[0.5px] animate-pulse" />
              <div className="absolute bottom-12 left-1/2 w-2.5 h-2.5 rounded-full bg-[#F5E6B4]/70 blur-[0.5px] animate-ping" />
            </div>
          </div>
        </div>

        {/* GLASS SURFACE REFLECTIONS & FACET HIGHLIGHTS */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute top-0 left-3 bottom-0 w-[1.5px] bg-gradient-to-b from-white/70 via-white/20 to-white/60" />
          <div className="absolute top-0 right-3 bottom-0 w-[1.5px] bg-gradient-to-b from-white/70 via-white/20 to-white/60" />
          <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-tr from-transparent via-white/25 to-transparent" />
        </div>

        {/* BLACK GOLD-FOIL QAYRA LABEL (Matching exact bottle label from user screenshot!) */}
        <div className="relative z-30 mx-auto w-36 sm:w-44 text-center bg-[#0C0B0A] border border-[#D4AF37] shadow-2xl p-2.5 rounded-sm space-y-1">
          {/* Gold Insignia Logo */}
          <div className="flex items-center justify-center space-x-1">
            <span className="w-4 h-4 rounded-full border border-[#D4AF37] text-[10px] font-serif font-bold text-[#D4AF37] flex items-center justify-center">
              Q
            </span>
          </div>

          <span className="font-serif font-bold text-xs sm:text-sm uppercase tracking-[0.25em] text-[#D4AF37] block">
            QAYRA
          </span>
          
          <span className="text-[7px] text-[#A0988E] uppercase tracking-[0.2em] block border-t border-[#D4AF37]/30 pt-0.5">
            CAR PERFUME
          </span>

          <span className="text-[9px] font-serif font-bold text-[#FDFBF7] uppercase tracking-wider block pt-0.5">
            OUD NOCTURNE
          </span>
        </div>

        {/* Heavy Glass Bottom Base */}
        <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-[#D4AF37]/60 via-[#C5A059]/30 to-transparent pointer-events-none z-20" />
      </div>
    </div>
  );
}
