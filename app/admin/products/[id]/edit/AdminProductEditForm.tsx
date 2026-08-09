'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

interface AdminProductEditFormProps {
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    description: string;
    scentFamily: string;
    topNotes: string;
    heartNotes: string;
    baseNotes: string;
    price: number;
    originalPrice: number | null;
    images: string[];
    stock: number;
    isActive: boolean;
    isFeatured: boolean;
  };
}

const SCENT_FAMILIES = ['Oud & Wood', 'Amber & Spice', 'Leather & Smoke', 'Fresh & Citrus'];

export default function AdminProductEditForm({ product }: AdminProductEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(product.name);
  const [subtitle, setSubtitle] = useState(product.subtitle || '');
  const [description, setDescription] = useState(product.description);
  const [scentFamily, setScentFamily] = useState(product.scentFamily);
  const [topNotes, setTopNotes] = useState(product.topNotes);
  const [heartNotes, setHeartNotes] = useState(product.heartNotes);
  const [baseNotes, setBaseNotes] = useState(product.baseNotes);
  const [price, setPrice] = useState(product.price.toString());
  const [originalPrice, setOriginalPrice] = useState(product.originalPrice ? product.originalPrice.toString() : '');
  const [imageUrl, setImageUrl] = useState(product.images[0] || '/images/products/oud_nocturne.jpg');
  const [stock, setStock] = useState(product.stock.toString());
  const [isActive, setIsActive] = useState(product.isActive);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subtitle,
          description,
          scentFamily,
          topNotes,
          heartNotes,
          baseNotes,
          price: Number(price),
          originalPrice: originalPrice ? Number(originalPrice) : null,
          images: [imageUrl],
          stock: Number(stock),
          isActive,
          isFeatured,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update product');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error updating fragrance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="bg-[#141210] border border-[#29241F] rounded-xl p-8 space-y-8 shadow-xl max-w-4xl">
      {error && (
        <div className="p-4 bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] text-xs rounded font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Perfume Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Scent Family *</label>
          <select
            value={scentFamily}
            onChange={(e) => setScentFamily(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          >
            {SCENT_FAMILIES.map((fam) => (
              <option key={fam} value={fam}>{fam}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Description *</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Top Notes</label>
          <input
            type="text"
            value={topNotes}
            onChange={(e) => setTopNotes(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Heart Notes</label>
          <input
            type="text"
            value={heartNotes}
            onChange={(e) => setHeartNotes(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Base Notes</label>
          <input
            type="text"
            value={baseNotes}
            onChange={(e) => setBaseNotes(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Price (₹) *</label>
          <input
            type="number"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Stock (Vials) *</label>
          <input
            type="number"
            required
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[#A0988E] font-medium uppercase tracking-wider">Image Path</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-6 md:col-span-2 pt-4 border-t border-[#29241F]">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[#29241F] text-[#D4AF37] focus:ring-0"
            />
            <span className="text-[#FDFBF7] font-semibold">Active in Storefront</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded border-[#29241F] text-[#D4AF37] focus:ring-0"
            />
            <span className="text-[#FDFBF7] font-semibold">Highlight as Featured Bestseller</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{loading ? 'Updating...' : 'Update Product Data'}</span>
      </button>
    </form>
  );
}
