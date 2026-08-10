import React from 'react';

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-[#0A0908] animate-pulse">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-[#141210] border-r border-[#29241F] hidden md:block" />

      {/* Main Content Skeleton */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#29241F] pb-6">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-[#29241F] rounded" />
            <div className="h-8 w-64 bg-[#1A1815] rounded" />
          </div>
          <div className="h-10 w-44 bg-[#1A1815] rounded border border-[#29241F]" />
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 w-28 bg-[#29241F] rounded" />
                <div className="h-8 w-8 bg-[#1A1815] rounded" />
              </div>
              <div className="h-8 w-32 bg-[#1A1815] rounded" />
              <div className="h-3 w-40 bg-[#29241F] rounded" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-4">
          <div className="h-6 w-48 bg-[#1A1815] rounded" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-[#1A1815] rounded" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
