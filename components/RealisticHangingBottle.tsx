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
  const [floatY, setFloatY] = useState(0);

  useEffect(() => {
    let animId: number;
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = Math.max(1, now - physics.current.lastMoveTime);
      const deltaX = e.clientX - physics.current.prevMouseX;

      // Mouse movement subtle momentum impulse
      const mouseSpeed = deltaX / dt;
      if (Math.abs(mouseSpeed) > 0.05) {
        physics.current.angularVelocity += mouseSpeed * 0.08;
      }

      physics.current.prevMouseX = e.clientX;
      physics.current.lastMoveTime = now;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const deltaX = clientX - physics.current.prevMouseX;
        physics.current.angularVelocity += deltaX * 0.04;
        physics.current.prevMouseX = clientX;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    // Continuous Harmonic Micro-Pendulum & Vertical Breathing Loop
    const updatePhysics = () => {
      time += 0.025;

      // 1. Natural subtle continuous sway (-3.5deg to +3.5deg)
      const continuousSway = Math.sin(time * 1.4) * 3.5;

      // 2. Vertical floating breathing effect (-5px to +5px)
      const continuousFloat = Math.sin(time * 1.8) * 5;
      setFloatY(continuousFloat);

      // 3. Restoring force & air damping for smooth mouse impulses
      const gravityForce = -0.06 * physics.current.angle;
      const damping = 0.94;

      physics.current.angularVelocity += gravityForce;
      physics.current.angularVelocity *= damping;
      physics.current.angle += physics.current.angularVelocity;

      // Gentle bounds for natural vehicle hanging bottle motion (-6deg to +6deg)
      physics.current.angle = Math.max(-6, Math.min(6, physics.current.angle));

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
      {/* Hanging Braided Cord & Real Bottle with Natural Pendulum Pivot */}
      <div
        className="relative flex flex-col items-center transition-transform duration-75 ease-out"
        style={{
          transformOrigin: 'top center',
          transform: `rotate(${renderAngle}deg) translateY(${floatY}px) translateZ(0)`,
        }}
      >
        {/* Rearview Mirror Gold Anchor Ring */}
        <div className="w-5 h-5 rounded-full border-2 border-[#D4AF37] bg-[#1A1815] shadow-2xl -mt-2 z-30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-inner" />
        </div>

        {/* Premium Braided Metallic Gold Cord */}
        <div className="w-1.5 h-36 sm:h-48 bg-gradient-to-b from-[#D4AF37] via-[#F5E6B4] to-[#8C6D27] shadow-[0_8px_20px_rgba(212,175,55,0.3)] z-20 relative rounded-full">
          {/* Braided Cord Crosshatch Overlay */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.35)_2px,rgba(0,0,0,0.35)_4px)] rounded-full" />

          {/* Gold Knot Accent */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded bg-[#D4AF37] border border-[#8C6D27] shadow-md" />
        </div>

        {/* Real HD Cutout Bottle */}
        <div className="relative z-10 -mt-1">
          {/* Warm Ambient Gold Backlight Glow */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-36 h-36 bg-[#D4AF37]/25 rounded-full blur-3xl animate-pulse pointer-events-none" />

          <CutoutPerfumeBottle tiltAngle={renderAngle} />
        </div>
      </div>

      {/* Dynamic Ambient Floor Shadow */}
      <div
        className="w-40 sm:w-56 h-4 rounded-full bg-[#000000]/90 blur-xl transition-transform duration-75 mt-2"
        style={{
          transform: `translateX(${renderAngle * 2.5}px) scaleX(${1 - Math.abs(renderAngle) * 0.01})`,
          opacity: 0.8 - Math.abs(renderAngle) * 0.01,
        }}
      />
    </div>
  );
}
