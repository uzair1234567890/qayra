'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Plus, Minus, Zap } from 'lucide-react';
import { useCart } from '@/components/CartContext';

interface ProductBuyActionsProps {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    image: string;
    scentFamily: string;
    stock: number;
  };
}

export default function ProductBuyActions({ product }: ProductBuyActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, setIsCartOpen } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        scentFamily: product.scentFamily,
      },
      quantity
    );
  };

  const handleBuyNow = () => {
    addToCart(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        scentFamily: product.scentFamily,
      },
      quantity
    );
    setIsCartOpen(false);
    router.push('/checkout');
  };

  return (
    <div className="space-y-4">
      {/* Quantity Control */}
      <div className="flex items-center space-x-4">
        <span className="text-xs uppercase tracking-wider text-[#A0988E] font-medium">Quantity:</span>
        <div className="flex items-center border border-[#29241F] rounded bg-[#141210]">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 text-[#A0988E] hover:text-[#FDFBF7] transition-colors"
            disabled={product.stock <= 0}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-4 text-sm font-semibold text-[#FDFBF7]">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
            className="p-2 text-[#A0988E] hover:text-[#FDFBF7] transition-colors"
            disabled={quantity >= product.stock}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="w-full py-4 bg-[#1A1815] hover:bg-[#25201B] border border-[#C5A059]/40 hover:border-[#D4AF37] text-[#FDFBF7] font-semibold text-xs uppercase tracking-[0.15em] rounded flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
          <span>Add To Selection</span>
        </button>

        <button
          onClick={handleBuyNow}
          disabled={product.stock <= 0}
          className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.15em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          <Zap className="w-4 h-4 fill-[#0A0908]" />
          <span>Instant Checkout</span>
        </button>
      </div>
    </div>
  );
}
