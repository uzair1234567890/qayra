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

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-6 border-t border-[#29241F] mt-4 flex flex-col space-y-4 text-sm uppercase tracking-widest text-[#B5AC9E]">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#D4AF37] py-1"
            >
              All Perfumes
            </Link>
            <Link
              href="/products?family=Oud+%26+Wood"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#D4AF37] py-1"
            >
              Oud & Wood Collection
            </Link>
            <Link
              href="/products?family=Amber+%26+Spice"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#D4AF37] py-1"
            >
              Amber & Spice
            </Link>
            <Link
              href="/products?family=Leather+%26+Smoke"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#D4AF37] py-1"
            >
              Leather & Smoke
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#D4AF37] py-1 flex items-center gap-2 text-xs text-[#D4AF37]"
            >
              <ShieldCheck className="w-4 h-4" /> Admin Access
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
