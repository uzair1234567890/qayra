'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, HeartHandshake, Sparkles } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.isAdmin) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#0A0908] border-t border-[#29241F] text-[#A0988E] pt-16 pb-12 px-4 sm:px-8">
      {/* Brand Value Pillars Strip */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-[#29241F]">
        <div className="flex items-start space-x-4 p-4 rounded-lg bg-[#141210] border border-[#29241F]">
          <div className="p-3 bg-[#1A1815] rounded border border-[#C5A059]/30 text-[#D4AF37]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-semibold text-[#FDFBF7] uppercase tracking-wider">
              40-Day Diffuser Longevity
            </h4>
            <p className="text-xs text-[#787063] mt-1 leading-relaxed">
              Formulated with high-concentration perfume oils released gradually through wood diffusion.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-4 p-4 rounded-lg bg-[#141210] border border-[#29241F]">
          <div className="p-3 bg-[#1A1815] rounded border border-[#C5A059]/30 text-[#D4AF37]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-semibold text-[#FDFBF7] uppercase tracking-wider">
              Handcrafted in Small Batches
            </h4>
            <p className="text-xs text-[#787063] mt-1 leading-relaxed">
              Every car perfume vial is individually filled and inspected for fragrance consistency.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-4 p-4 rounded-lg bg-[#141210] border border-[#29241F]">
          <div className="p-3 bg-[#1A1815] rounded border border-[#C5A059]/30 text-[#D4AF37]">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-serif font-semibold text-[#FDFBF7] uppercase tracking-wider">
              Free Express Delivery
            </h4>
            <p className="text-xs text-[#787063] mt-1 leading-relaxed">
              100% free express delivery across all pin-codes in India on every order.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 py-16">
        {/* Brand Overview */}
        <div className="space-y-4">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-serif tracking-[0.25em] text-[#FDFBF7] font-bold uppercase">
              QAYRA
            </span>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] mt-0.5">
              Luxury Car Fragrance
            </span>
          </Link>
          <p className="text-xs text-[#787063] leading-relaxed">
            Qayra defines modern vehicle luxury through rich scent artistry. Our hanging car perfumes elevate every journey with amber, oud, and leather accords.
          </p>
        </div>

        {/* Collections */}
        <div>
          <h4 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#FDFBF7] mb-4">
            Car Fragrance Families
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link href="/products?family=Oud+%26+Wood" className="hover:text-[#D4AF37] transition-colors">
                Oud & Smoked Woods
              </Link>
            </li>
            <li>
              <Link href="/products?family=Amber+%26+Spice" className="hover:text-[#D4AF37] transition-colors">
                Warm Amber & Spices
              </Link>
            </li>
            <li>
              <Link href="/products?family=Leather+%26+Smoke" className="hover:text-[#D4AF37] transition-colors">
                Tuscan Leather & Tobacco
              </Link>
            </li>
            <li>
              <Link href="/products?family=Fresh+%26+Citrus" className="hover:text-[#D4AF37] transition-colors">
                Imperial Citrus & Bergamot
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h4 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#FDFBF7] mb-4">
            Customer Sanctuary
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link href="/#philosophy" className="hover:text-[#D4AF37] transition-colors">
                The Qayra Story
              </Link>
            </li>
            <li>
              <Link href="/checkout" className="hover:text-[#D4AF37] transition-colors">
                Track Order
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link href="/admin" className="hover:text-[#D4AF37] transition-colors text-[#D4AF37] font-medium flex items-center gap-1">
                  <span>Admin Management Portal</span>
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Newsletter Signup */}
        <div>
          <h4 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#FDFBF7] mb-4">
            Join The Qayra Society
          </h4>
          <p className="text-xs text-[#787063] mb-4">
            Subscribe for private releases of seasonal car perfume editions and scent notes.
          </p>
          {subscribed ? (
            <div className="flex items-center space-x-2 text-xs text-[#D4AF37] bg-[#1A1815] p-3 border border-[#C5A059]/30 rounded">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Welcome to Qayra Society.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141210] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none placeholder-[#787063]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 bg-[#D4AF37] text-[#0A0908] rounded hover:brightness-110 transition-all text-xs font-bold"
                  aria-label="Subscribe to newsletter"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sub-footer Copyright */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-[#29241F] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#787063]">
        <p>&copy; {new Date().getFullYear()} Qayra Luxury Car Perfumes. All rights reserved.</p>
        <p className="mt-2 sm:mt-0 font-serif tracking-widest text-[#D4AF37]">
          OUD & EMBERS &bull; CRAFTED FOR DISCERNING DRIVES
        </p>
      </div>
    </footer>
  );
}
