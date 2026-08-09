'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

const SCENT_FAMILIES = ['Oud & Wood', 'Amber & Spice', 'Leather & Smoke', 'Fresh & Citrus'];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [scentFamily, setScentFamily] = useState('Oud & Wood');
  const [topNotes, setTopNotes] = useState('Cardamom, Bergamot, Pink Pepper');
  const [heartNotes, setHeartNotes] = useState('Smoked Oud, Bulgarian Rose, Saffron');
  const [baseNotes, setBaseNotes] = useState('Royal Amber, Vetiver, Dark Leather');
  const [price, setPrice] = useState('1499');
  const [originalPrice, setOriginalPrice] = useState('1999');
  const [imageUrl, setImageUrl] = useState('/images/products/oud_nocturne.jpg');
  const [stock, setStock] = useState('40');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create product');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error creating fragrance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#29241F] pb-6">
          <div className="space-y-1">
            <Link href="/admin/products" className="text-xs uppercase tracking-widest text-[#A0988E] hover:text-[#D4AF37] flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Catalog
            </Link>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">Add New Car Perfume</h1>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] text-xs rounded font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#141210] border border-[#29241F] rounded-xl p-8 space-y-8 shadow-xl max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Perfume Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Smoked Vetiver"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Subtitle / Tagline</label>
              <input
                type="text"
                placeholder="e.g. Smoked Accord & Atlas Cedar"
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
                placeholder="Describe the mood, fragrance journey, and cabin atmosphere..."
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
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Selling Price (₹) *</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Original Price (₹)</label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Stock Count (Vials) *</label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A0988E] font-medium uppercase tracking-wider">Product Image Path / URL</label>
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
            <span>{loading ? 'Saving Fragrance...' : 'Save Product To Database'}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
