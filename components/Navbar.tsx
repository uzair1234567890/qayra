'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, ShieldCheck, Menu, X } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar() {
  const { setIsCartOpen, totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement Bar */}
      <div className="bg-[#141210] border-b border-[#29241F] py-2 px-4 text-center text-xs tracking-wider uppercase text-[#D4AF37] font-medium flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
        <span>Complimentary Express Delivery Across India &bull; Handcrafted Car Perfumes</span>
      </div>

      {/* Main Glass Navigation */}
      <nav className="glass-header px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="group flex flex-col items-start">
            <span className="text-2xl sm:text-3xl font-serif tracking-[0.25em] text-[#FDFBF7] group-hover:text-[#D4AF37] transition-colors font-bold uppercase">
              QAYRA
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#A0988E] -mt-1 font-sans">
              Luxury Car Fragrance
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8 text-xs uppercase tracking-[0.15em] font-medium text-[#B5AC9E]">
            <Link href="/products" className="hover:text-[#D4AF37] transition-colors">
              All Car Perfumes
            </Link>
            <Link href="/products?family=Oud+%26+Wood" className="hover:text-[#D4AF37] transition-colors">
              Oud & Wood
            </Link>
            <Link href="/products?family=Amber+%26+Spice" className="hover:text-[#D4AF37] transition-colors">
              Amber & Spice
            </Link>
            <Link href="/products?family=Leather+%26+Smoke" className="hover:text-[#D4AF37] transition-colors">
              Leather & Smoke
            </Link>
            <Link href="/#philosophy" className="hover:text-[#D4AF37] transition-colors">
              Philosophy
            </Link>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center space-x-1 text-xs text-[#A0988E] hover:text-[#D4AF37] border border-[#29241F] hover:border-[#D4AF37] px-3 py-1.5 rounded transition-all"
              title="Admin Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#FDFBF7] hover:text-[#D4AF37] transition-colors"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#0A0908] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#FDFBF7] hover:text-[#D4AF37]"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Luxury Mobile Slide-Out Glass Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[88px] z-50 bg-[#0A0908]/95 backdrop-blur-xl border-t border-[#29241F] md:hidden flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D4AF37] border-b border-[#29241F] pb-2">
                Fragrance Collections
              </div>
              <div className="flex flex-col space-y-3">
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-[#141210] border border-[#29241F] rounded-lg text-sm uppercase tracking-wider text-[#FDFBF7] font-semibold active:border-[#D4AF37]"
                >
                  <span>All Car Perfumes</span>
                  <span className="text-xs text-[#D4AF37] font-mono">Vault</span>
                </Link>
                <Link
                  href="/products?family=Oud+%26+Wood"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-[#141210] border border-[#29241F] rounded-lg text-xs uppercase tracking-wider text-[#B5AC9E] active:border-[#D4AF37]"
                >
                  <span>Oud & Wood Collection</span>
                  <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 font-semibold">Deep</span>
                </Link>
                <Link
                  href="/products?family=Amber+%26+Spice"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-[#141210] border border-[#29241F] rounded-lg text-xs uppercase tracking-wider text-[#B5AC9E] active:border-[#D4AF37]"
                >
                  <span>Amber & Spice</span>
                  <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded border border-[#C5A059]/30 font-semibold">Warm</span>
                </Link>
                <Link
                  href="/products?family=Leather+%26+Smoke"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-[#141210] border border-[#29241F] rounded-lg text-xs uppercase tracking-wider text-[#B5AC9E] active:border-[#D4AF37]"
                >
                  <span>Leather & Smoke</span>
                  <span className="text-[10px] bg-[#A38220]/10 text-[#A38220] px-2 py-0.5 rounded border border-[#A38220]/30 font-semibold">Rich</span>
                </Link>
                <Link
                  href="/#philosophy"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 bg-[#141210] border border-[#29241F] rounded-lg text-xs uppercase tracking-wider text-[#B5AC9E]"
                >
                  <span>Our Craft Philosophy</span>
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-[#29241F] space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsCartOpen(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded flex items-center justify-center space-x-2 shadow-xl active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View Selection ({totalItemsCount})</span>
              </button>

              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-[#1A1815] border border-[#29241F] text-[#A0988E] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center space-x-2 active:border-[#D4AF37]"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Admin Portal</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
