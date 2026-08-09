'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from './CartContext';

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, subtotal, totalItemsCount } = useCart();

  if (!isCartOpen) return null;

  const FREE_SHIPPING_THRESHOLD = 1499;
  const progressPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#141210] border-l border-[#29241F] shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#29241F] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="font-serif text-xl tracking-wider text-[#FDFBF7] uppercase">
                Your Selection ({totalItemsCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-[#A0988E] hover:text-[#FDFBF7] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-[#1A1815] p-4 border-b border-[#29241F] text-xs">
            <div className="flex items-center justify-between text-[#B5AC9E] mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Truck className="w-4 h-4 text-[#D4AF37]" />
                {remainingForFreeShipping <= 0 ? (
                  <span className="text-[#D4AF37] font-semibold">Unlocked Free Express Shipping!</span>
                ) : (
                  <span>Add ₹{remainingForFreeShipping.toLocaleString('en-IN')} for Free Express Delivery</span>
                )}
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-[#29241F] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center space-y-4 text-[#A0988E]">
                <ShoppingBag className="w-12 h-12 stroke-[1.5] text-[#29241F]" />
                <p className="text-base font-serif tracking-wide text-[#FDFBF7]">Your perfume bag is empty.</p>
                <p className="text-xs max-w-xs">Explore our luxury car fragrances and select an unforgettable scent for your vehicle.</p>
                <Link
                  href="/products"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-6 py-2.5 bg-[#29241F] hover:bg-[#D4AF37] text-[#FDFBF7] hover:text-[#0A0908] text-xs uppercase tracking-widest transition-all rounded font-semibold"
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex space-x-4 p-3 bg-[#1A1815] border border-[#29241F] rounded-lg relative group"
                >
                  {/* Item Image */}
                  <div className="relative w-20 h-20 rounded bg-[#0A0908] overflow-hidden flex-shrink-0 border border-[#29241F]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-serif text-base text-[#FDFBF7] font-semibold leading-tight">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#787063] hover:text-[#E63946] transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mt-0.5">
                        {item.scentFamily}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[#29241F] rounded bg-[#0A0908]">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-[#A0988E] hover:text-[#FDFBF7]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs text-[#FDFBF7] font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-[#A0988E] hover:text-[#FDFBF7]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-serif text-sm font-semibold text-[#D4AF37]">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer / Checkout */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-[#29241F] bg-[#1A1815] space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#A0988E]">
                  <span>Subtotal</span>
                  <span className="text-[#FDFBF7] font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-[#A0988E]">
                  <span>Shipping (India Express)</span>
                  <span className="text-[#D4AF37]">
                    {subtotal >= FREE_SHIPPING_THRESHOLD ? 'FREE' : '₹99'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-serif font-bold text-[#FDFBF7] pt-2 border-t border-[#29241F]">
                  <span>Total</span>
                  <span className="text-[#D4AF37]">
                    ₹{(subtotal + (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 99)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-lg"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
