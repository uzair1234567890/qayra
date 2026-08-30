'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Check, Gift, Sparkles } from 'lucide-react';
import { useCart } from './CartContext';

const BUNDLE_ITEMS = [
  {
    id: 'shadow-elixir',
    slug: 'shadow-elixir',
    name: 'Shadow Elixir',
    price: 1499,
    image: '/images/products/shadow_elixir.jpg',
    scentFamily: 'Oud & Wood',
    notes: 'Smoked Agarwood & Dark Leather',
  },
  {
    id: 'velvet-midnight',
    slug: 'velvet-midnight',
    name: 'Velvet Midnight',
    price: 1499,
    image: '/images/products/velvet_midnight.jpg',
    scentFamily: 'Amber & Spice',
    notes: 'Baltic Amber & Atlas Cedarwood',
  },
  {
    id: 'obsidian-mist',
    slug: 'obsidian-mist',
    name: 'Obsidian Mist',
    price: 1499,
    image: '/images/products/obsidian_mist.jpg',
    scentFamily: 'Leather & Smoke',
    notes: 'Tuscan Leather & Tobacco Leaf',
  },
];

export default function GiftBundleSection() {
  const { addToCart, setIsCartOpen } = useCart();
  const [added, setAdded] = useState(false);

  const INDIVIDUAL_TOTAL = 1499 * 3; // 4497
  const BUNDLE_PRICE = 999; // Updated combo price ₹999
  const SAVINGS_AMOUNT = INDIVIDUAL_TOTAL - BUNDLE_PRICE;
  const SAVINGS_PERCENT = Math.round((SAVINGS_AMOUNT / INDIVIDUAL_TOTAL) * 100);

  const handleAddBundleToCart = () => {
    addToCart(
      {
        id: 'executive-trio-combo-999',
        slug: 'executive-trio-bundle',
        name: 'The Executive Trio Gift Set (3 Fragrances)',
        price: BUNDLE_PRICE,
        image: '/images/products/shadow_elixir.jpg',
        scentFamily: 'Limited Edition Combo Set',
      },
      1
    );
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setIsCartOpen(true);
    }, 1200);
  };

  return (
    <section className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Side: Text & Bundle Offers */}
        <div className="space-y-6 lg:max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Limited Edition Executive Gift Trio</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7]">
              The Executive Trio Set
            </h2>
            <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed">
              Experience the full Qayra scent journey. Includes 3 signature 30-day wooden diffusers packaged in a matte gold-embossed velvet presentation gift box.
            </p>
          </div>

          {/* Included Fragrances & Notes List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            {BUNDLE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="bg-[#1A1815] border border-[#29241F] rounded-lg p-3 flex items-center space-x-3 group hover:border-[#D4AF37] transition-all"
              >
                <div className="relative w-12 h-12 rounded-md bg-[#0A0908] border border-[#29241F] overflow-hidden shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-serif font-bold text-[#FDFBF7] truncate">{item.name}</p>
                  <p className="text-[9px] text-[#D4AF37] uppercase font-semibold">{item.scentFamily}</p>
                  <p className="text-[8px] text-[#787063] truncate">{item.notes}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing & Savings CTA */}
          <div className="pt-4 border-t border-[#29241F] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline space-x-3">
                <span className="font-serif text-3xl font-bold text-[#D4AF37]">
                  ₹{BUNDLE_PRICE.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-[#787063] line-through font-serif">
                  ₹{INDIVIDUAL_TOTAL.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-[#52B788] font-semibold mt-0.5">
                🎉 Special Combo Offer: Save ₹{SAVINGS_AMOUNT.toLocaleString('en-IN')} ({SAVINGS_PERCENT}% OFF)
              </p>
            </div>

            <button
              onClick={handleAddBundleToCart}
              disabled={added}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-80"
            >
              {added ? (
                <>
                  <Check className="w-4 h-4 text-[#0A0908]" />
                  <span>Combo Added to Bag!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Claim Executive Trio (₹999)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: 3-Bottle Showcase Visual Collage matching Scent Notes */}
        <div className="relative w-full lg:w-[420px] aspect-square rounded-2xl bg-[#1A1815] border border-[#29241F] overflow-hidden p-6 flex flex-col items-center justify-between shadow-2xl group">
          <div className="grid grid-cols-3 gap-2 w-full h-[72%] relative">
            {BUNDLE_ITEMS.map((item, index) => (
              <div
                key={item.id}
                className="relative rounded-xl overflow-hidden border border-[#C5A059]/40 shadow-lg group-hover:scale-[1.02] transition-transform duration-500"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908] via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2 inset-x-1 text-center">
                  <span className="text-[8px] font-serif font-bold text-[#FDFBF7] block truncate px-1">
                    {item.name}
                  </span>
                  <span className="text-[7px] text-[#D4AF37] uppercase block">
                    {item.scentFamily}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-10 w-full text-center space-y-1 bg-[#0A0908]/90 backdrop-blur-md p-3.5 rounded-xl border border-[#C5A059]/50 shadow-xl mt-3">
            <div className="flex items-center justify-center space-x-1 text-[#D4AF37]">
              <Sparkles className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold block">
                Executive Combo Offer &bull; ₹999
              </span>
              <Sparkles className="w-3 h-3" />
            </div>
            <p className="font-serif text-sm font-bold text-[#FDFBF7]">
              3 &times; 30-Day Handcrafted Vials
            </p>
            <p className="text-[10px] text-[#A0988E]">
              Shadow Elixir &bull; Velvet Midnight &bull; Obsidian Mist
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
