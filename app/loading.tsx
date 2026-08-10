import React from 'react';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0908]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#29241F] border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-serif font-bold">
          QAYRA
        </span>
      </div>
    </div>
  );
}
