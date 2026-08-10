'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ReactiveHeroCanvas from './ReactiveHeroCanvas';

export default function HeroInteractiveBackground() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Subtle ambient offset calculation
      const moveX = (e.clientX - centerX) / 50;
      const moveY = (e.clientY - centerY) / 50;

      setOffset({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
      {/* Dark Cabin Interior Atmosphere Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F0D0B] via-[#0A0908] to-[#0A0908]" />

      {/* Subtle Cabin Texture Overlay */}
      <div
        className="absolute inset-0 opacity-20 transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(${offset.x * 0.5}px, ${offset.y * 0.5}px, 0) scale(1.05)`,
        }}
      >
        <Image
          src="/images/products/leather_tobacco.jpg"
          alt="Cabin interior atmosphere"
          fill
          priority
          className="object-cover opacity-30"
        />
      </div>

      {/* Dark Luxury Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-[#0A0908]/75 to-transparent z-1" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0908] via-transparent to-[#0A0908] z-1" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#0A0908_85%)] z-1 opacity-90" />

      {/* Interactive Golden Ambient Spotlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-[#D4AF37]/12 blur-3xl z-2 transition-transform duration-500 ease-out pointer-events-none"
        style={{
          left: `calc(65% + ${offset.x * 1.5}px - 300px)`,
          top: `calc(35% + ${offset.y * 1.5}px - 300px)`,
        }}
      />

      {/* 60fps HTML5 Reactive Particle Canvas */}
      <ReactiveHeroCanvas />
    </div>
  );
}
