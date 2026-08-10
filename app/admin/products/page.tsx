import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';
import AdminProductActions from './AdminProductActions';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      scentFamily: true,
      price: true,
      stock: true,
      isActive: true,
      images: true,
      createdAt: true,
    },
  });

  const formattedProducts = products.map((prod) => {
    let images = [];
    try {
      images = JSON.parse(prod.images);
    } catch (e) {
      images = [prod.images];
    }
    return { ...prod, images };
  });

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#29241F] pb-6">
          <div>
            <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.25em]">
              Inventory Management
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">
              Product Catalog ({products.length})
            </h1>
          </div>

          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded flex items-center space-x-1.5 hover:brightness-110 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Fragrance</span>
          </Link>
        </div>

        {/* Product Table */}
        <div className="bg-[#141210] border border-[#29241F] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A1815] text-[#A0988E] uppercase tracking-wider border-b border-[#29241F]">
                <tr>
                  <th className="p-4">Perfume</th>
                  <th className="p-4">Scent Family</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#29241F] text-[#FDFBF7]">
                {formattedProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#1A1815]/50">
                    <td className="p-4 flex items-center space-x-3">
                      <div className="relative w-12 h-12 rounded bg-[#0A0908] border border-[#29241F] overflow-hidden flex-shrink-0">
                        <Image src={prod.images[0] || '/images/products/oud_nocturne.jpg'} alt={prod.name} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-[#FDFBF7]">{prod.name}</div>
                        <div className="text-[10px] text-[#787063] font-mono">{prod.slug}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-[#1A1815] text-[#D4AF37] border border-[#C5A059]/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                        {prod.scentFamily}
                      </span>
                    </td>
                    <td className="p-4 font-serif font-bold text-sm text-[#D4AF37]">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className={`font-bold ${prod.stock <= 15 ? 'text-[#E69A28]' : 'text-[#2A9D8F]'}`}>
                        {prod.stock} Vials
                      </span>
                    </td>
                    <td className="p-4">
                      {prod.isActive ? (
                        <span className="text-[10px] font-bold text-[#2A9D8F] bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 px-2 py-0.5 rounded uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#787063] bg-[#787063]/10 border border-[#787063]/30 px-2 py-0.5 rounded uppercase">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <AdminProductActions productId={prod.id} productName={prod.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
