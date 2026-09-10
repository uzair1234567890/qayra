import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Return & Refund Policy | Qayra Luxury Car Fragrances',
  description: 'Read the official return, refund, and replacement policy for Qayra luxury hanging car perfumes.',
};

export default function ReturnPolicyPage() {
  const whatsappUrl = `https://wa.me/919822929716?text=${encodeURIComponent(
    'Hi Qayra Support, I would like to inquire about a return / refund for my order.'
  )}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 space-y-12">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#A0988E] hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Boutique</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-8 sm:p-12 text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center justify-center p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-full text-[#D4AF37] mb-2">
          <RefreshCw className="w-8 h-8" />
        </div>
        <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold block">
          Customer Sanctuary
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7]">
          Return & Refund Policy
        </h1>
        <p className="text-xs sm:text-sm text-[#A0988E] max-w-xl mx-auto leading-relaxed">
          At Qayra, each car fragrance is handcrafted with high-concentration perfume oils and inspected before dispatch. Please review our clear guidelines below regarding returns and refunds.
        </p>
      </div>

      {/* The Core 2-Column Policy Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Unopened Bottle -> Full Refund */}
        <div className="bg-[#141210] border border-[#52B788]/40 rounded-xl p-6 sm:p-8 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#52B788]/10 border border-[#52B788]/30 text-[#52B788] text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Eligible for Refund</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FDFBF7]">
              Parcel Delivered & Bottle Unopened
            </h2>
            <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed">
              If your parcel has been delivered, but the fragrance bottle remains <strong className="text-[#FDFBF7]">completely unopened, unsealed, and unused</strong> in its original luxury box packaging, you are entitled to a full refund.
            </p>
            <ul className="text-xs text-[#A0988E] space-y-2 pt-2 border-t border-[#29241F]">
              <li className="flex items-start space-x-2">
                <span className="text-[#52B788] font-bold">&bull;</span>
                <span>Request must be initiated within <strong>7 days</strong> of parcel delivery.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#52B788] font-bold">&bull;</span>
                <span>The seal and packaging must be intact and resalable.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#52B788] font-bold">&bull;</span>
                <span>Once the parcel is received and inspected, the refund will be credited back within 3–5 business days.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Box 2: Opened Bottle -> Strict No Refund */}
        <div className="bg-[#141210] border border-[#E69A28]/40 rounded-xl p-6 sm:p-8 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E69A28]/10 border border-[#E69A28]/30 text-[#E69A28] text-xs font-semibold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>No Refund</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FDFBF7]">
              Bottle Opened or Used
            </h2>
            <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed">
              If the fragrance bottle has been <strong className="text-[#FDFBF7]">opened, unsealed, tested, or used</strong> in any manner, <strong className="text-[#E69A28]">no refund will be provided</strong> under any circumstances.
            </p>
            <ul className="text-xs text-[#A0988E] space-y-2 pt-2 border-t border-[#29241F]">
              <li className="flex items-start space-x-2">
                <span className="text-[#E69A28] font-bold">&bull;</span>
                <span>Due to strict olfactory quality and hygiene standards for personal luxury perfumes, opened oils cannot be accepted back or restocked.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#E69A28] font-bold">&bull;</span>
                <span>Bottles with broken seals or oil contact on the wooden diffuser cap are non-refundable.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transit Damage & Defective Products */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center space-x-3 text-[#D4AF37]">
          <ShieldCheck className="w-6 h-6 shrink-0" />
          <h3 className="font-serif text-lg font-bold text-[#FDFBF7]">
            Damaged, Broken, or Leaking Bottles in Transit
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed">
          While we secure every glass bottle with custom protective packaging, in the rare event that your shipment arrives damaged, cracked, leaking, or with the wrong item:
        </p>
        <div className="bg-[#1A1815] border border-[#29241F] p-4 rounded-lg text-xs text-[#FDFBF7] space-y-1.5">
          <p>
            &bull; Please notify our concierge team within <strong className="text-[#D4AF37]">48 hours of delivery</strong>.
          </p>
          <p>
            &bull; Simply send a clear photo or short unboxing video of the damaged bottle to our official WhatsApp support at <strong className="text-[#25D366]">9822929716</strong>.
          </p>
          <p>
            &bull; We will arrange an <strong className="text-[#52B788]">immediate free replacement dispatch</strong> or process a 100% full refund with zero hassle.
          </p>
        </div>
      </div>

      {/* How to Initiate Support Box */}
      <div className="bg-gradient-to-r from-[#141F16] via-[#1A2E1D] to-[#141F16] border-2 border-[#25D366]/40 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#FDFBF7]">
          Need Assistance With Your Order?
        </h3>
        <p className="text-xs sm:text-sm text-[#D6D0C7] max-w-md mx-auto leading-relaxed">
          Connect directly with our dedicated customer concierge team on WhatsApp with your Order ID for rapid verification.
        </p>
        <div className="pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center space-x-2 px-8 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-[#0A0908] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-[#0A0908]" />
            <span>Connect on WhatsApp (+91 9822929716)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
