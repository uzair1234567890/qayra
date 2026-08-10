import React from 'react';

export default function ProductDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-16 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-64 bg-[#1A1815] rounded" />

      {/* Main PDP Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Skeleton */}
        <div className="relative aspect-square rounded-xl bg-[#141210] border border-[#29241F] overflow-hidden">
          <div className="absolute inset-0 bg-[#1A1815]" />
        </div>

        {/* Right Column: Details Skeleton */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-4 w-36 bg-[#29241F] rounded" />
            <div className="h-10 w-3/4 bg-[#1A1815] rounded-lg" />
            <div className="h-4 w-1/2 bg-[#29241F] rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-[#141210] rounded" />
              <div className="h-3 w-5/6 bg-[#141210] rounded" />
            </div>
          </div>

          {/* Pricing Banner Skeleton */}
          <div className="p-4 bg-[#141210] border border-[#29241F] rounded-lg flex items-center justify-between">
            <div className="h-8 w-28 bg-[#1A1815] rounded" />
            <div className="h-6 w-24 bg-[#1A1815] rounded" />
          </div>

          {/* Buy Buttons Skeleton */}
          <div className="space-y-3">
            <div className="h-12 w-full bg-[#1A1815] rounded border border-[#29241F]" />
            <div className="h-12 w-full bg-[#29241F] rounded" />
          </div>
        </div>
      </div>

      {/* Pyramid Section Skeleton */}
      <div className="h-64 bg-[#141210] border border-[#29241F] rounded-xl" />
    </div>
  );
}
