'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, ShieldCheck, User, Menu, X } from 'lucide-react';
import { useCart } from './CartContext';

export default function Navbar() {
  const { setIsCartOpen, totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCustomer(data.user);
        }
        if (data.isAdmin) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

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
          <div className="flex items-center space-x-3.5">
            {/* Customer Account / Login Button */}
            <Link
              href={customer ? '/account' : '/login'}
              className="flex items-center space-x-1.5 text-xs text-[#E6E1DA] hover:text-[#D4AF37] border border-[#29241F] hover:border-[#D4AF37] px-3 py-1.5 rounded transition-all bg-[#141210]/60"
              title={customer ? `My Account (${customer.name})` : 'Customer Sign In'}
            >
              <User className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate font-medium">
                {customer ? customer.name.split(' ')[0] : 'Sign In'}
              </span>
            </Link>

            {/* Admin Portal Link (Visible only to admin user umairuzair) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center space-x-1 text-xs text-[#D4AF37] hover:text-[#FDFBF7] border border-[#D4AF37]/50 hover:border-[#D4AF37] px-3 py-1.5 rounded transition-all bg-[#D4AF37]/10"
                title="Admin Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-semibold">Admin</span>
              </Link>
            )}

            {/* Cart Drawer Trigger */}
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
                  <span className="text-[10px] bg-[#E5D5B8]/10 text-[#E5D5B8] px-2 py-0.5 rounded border border-[#E5D5B8]/30 font-semibold">Intense</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-[#29241F] space-y-3">
                <Link
                  href={customer ? '/account' : '/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-[#1A1815] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold rounded-lg"
                >
                  <User className="w-4 h-4" />
                  <span>{customer ? `My Account (${customer.name})` : 'Customer Sign In'}</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full py-3 bg-[#1A1815] border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-semibold rounded-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Portal</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="text-center text-[10px] text-[#A0988E] uppercase tracking-widest pt-6 border-t border-[#29241F] mt-6">
              Qayra Parfums &bull; Up to 30-Day Longevity
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
