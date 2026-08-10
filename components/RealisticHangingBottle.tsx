'use client';

import React, { useState, useEffect, useRef } from 'react';
import CutoutPerfumeBottle from './CutoutPerfumeBottle';

export default function RealisticHangingBottle() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pendulum Physics State
  const physics = useRef({
    angle: 0,
    angularVelocity: 0,
    prevMouseX: 0,
    lastMoveTime: 0,
  });

  const [renderAngle, setRenderAngle] = useState(0);

  useEffect(() => {
    let animId: number;
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = Math.max(1, now - physics.current.lastMoveTime);
      const deltaX = e.clientX - physics.current.prevMouseX;

      // Mouse speed adds dynamic swing momentum
      const mouseSpeed = deltaX / dt;
      if (Math.abs(mouseSpeed) > 0.05) {
        physics.current.angularVelocity += mouseSpeed * 0.35;
      }

      physics.current.prevMouseX = e.clientX;
      physics.current.lastMoveTime = now;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const deltaX = clientX - physics.current.prevMouseX;
        physics.current.angularVelocity += deltaX * 0.08;
        physics.current.prevMouseX = clientX;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    // Continuous Harmonic Pendulum Simulation Loop
    const updatePhysics = () => {
      time += 0.035;

      // 1. Continuous smooth idle pendulum sway (-10deg to +10deg)
      const continuousSway = Math.sin(time * 1.6) * 10;

      // 2. Physics restoration force & air damping for mouse impulses
      const gravityForce = -0.05 * physics.current.angle;
      const damping = 0.96;

      physics.current.angularVelocity += gravityForce;
      physics.current.angularVelocity *= damping;
      physics.current.angle += physics.current.angularVelocity;

      // Clamp mouse impulse swing to max bounds (-20deg to +20deg)
      physics.current.angle = Math.max(-20, Math.min(20, physics.current.angle));

      const totalAngle = physics.current.angle + continuousSway;
      setRenderAngle(totalAngle);

      animId = requestAnimationFrame(updatePhysics);
    };

    updatePhysics();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-start select-none pointer-events-none"
    >
      {/* Real Hanging Cord & Cutout Bottle Wrapper with Pendulum Pivot at Top Header Anchor */}
      <div
        className="relative flex flex-col items-center transition-transform duration-75 ease-out"
        style={{
          transformOrigin: 'top center',
          transform: `rotate(${renderAngle}deg) translateZ(0)`,
        }}
      >
        {/* Rearview Mirror Anchor Ring */}
        <div className="w-6 h-6 rounded-full border-3 border-[#D4AF37] bg-[#1A1815] shadow-2xl -mt-3 z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-inner" />
        </div>

        {/* Thick Braided Metallic Gold Hanging Cord */}
        <div className="w-1.5 h-44 sm:h-60 bg-gradient-to-b from-[#D4AF37] via-[#F5E6B4] to-[#8C6D27] shadow-[0_10px_25px_rgba(212,175,55,0.4)] z-20 relative rounded-full">
          {/* Braided Cord Texture Overlay */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.4)_2px,rgba(0,0,0,0.4)_4px)] rounded-full" />
          
          {/* Gold Cord Knot Accent */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-md bg-[#D4AF37] border-2 border-[#8C6D27] shadow-md" />
        </div>

        {/* Pure 3D Cutout Perfume Bottle Component (NO Square Frame!) */}
        <div className="relative z-10 -mt-2">
          {/* Wooden Cap Vapor Diffusion Glow */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-28 bg-[#D4AF37]/30 rounded-full blur-2xl animate-pulse pointer-events-none" />

          {/* Large Cutout Glass Bottle */}
          <CutoutPerfumeBottle tiltAngle={renderAngle} />
        </div>
      </div>

      {/* Dynamic Damped Floor Shadow scaling synchronously with continuous swing */}
      <div
        className="w-48 sm:w-64 h-5 rounded-full bg-[#000000]/95 blur-xl transition-transform duration-75 mt-4"
        style={{
          transform: `translateX(${renderAngle * 4.5}px) scaleX(${1 - Math.abs(renderAngle) * 0.012})`,
          opacity: 0.85 - Math.abs(renderAngle) * 0.01,
        }}
      />
    </div>
  );
}
