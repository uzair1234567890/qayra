'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck } from 'lucide-react';

export default function HeaderBanner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('ROYAL15');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-r from-[#141210] via-[#1A1815] to-[#141210] border-b border-[#29241F] text-[#FDFBF7] py-2 px-4 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center space-x-2 justify-center sm:justify-start">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#D4AF37] text-[#0A0908]">
            FIRST ORDER OFFER
          </span>
          <span className="text-[#A0988E] text-[11px] sm:text-xs">
            Use Code <span className="font-mono text-[#D4AF37] font-bold">ROYAL15</span> for <strong className="text-[#FDFBF7]">15% OFF</strong> + Free Express Delivery across India
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-[#141210] hover:bg-[#25201B] border border-[#C5A059]/40 hover:border-[#D4AF37] text-[#D4AF37] px-2.5 py-1 rounded transition-all active:scale-95"
            title="Copy promo code ROYAL15"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#52B788]" />
                <span className="text-[#52B788] font-bold">COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <span className="hidden md:inline text-[#787063]">&bull;</span>

          <span className="hidden md:flex items-center text-[#A0988E] gap-1 text-[10px] uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-[#D4AF37]" /> 40-Day Guarantee
          </span>
        </div>
      </div>
    </div>
  );
}
