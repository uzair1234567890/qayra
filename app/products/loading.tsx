import React from 'react';

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10 animate-pulse">
      {/* Title Header Skeleton */}
      <div className="text-center space-y-3 max-w-2xl mx-auto flex flex-col items-center">
        <div className="h-3 w-32 bg-[#29241F] rounded" />
        <div className="h-10 w-72 sm:w-96 bg-[#1A1815] rounded-lg mt-2" />
        <div className="h-4 w-80 bg-[#141210] rounded" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-[#1A1815] rounded border border-[#29241F]" />
          ))}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="h-9 w-full sm:w-64 bg-[#1A1815] rounded border border-[#29241F]" />
          <div className="h-9 w-32 bg-[#1A1815] rounded border border-[#29241F]" />
        </div>
      </div>

      {/* Products Grid Skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-[#141210] border border-[#29241F] rounded-lg overflow-hidden space-y-4 p-4 flex flex-col justify-between"
          >
            <div className="aspect-square bg-[#1A1815] rounded-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#29241F]/30 to-transparent" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-[#29241F] rounded" />
                <div className="h-3 w-16 bg-[#29241F] rounded" />
              </div>
              <div className="h-6 w-3/4 bg-[#1A1815] rounded" />
              <div className="h-3 w-1/2 bg-[#29241F] rounded" />
            </div>
            <div className="pt-3 border-t border-[#29241F] flex justify-between items-center">
              <div className="h-6 w-20 bg-[#1A1815] rounded" />
              <div className="h-8 w-20 bg-[#1A1815] rounded border border-[#29241F]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
