import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';
import AdminProductEditForm from './AdminProductEditForm';

export const revalidate = 0;

interface EditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditPageProps) {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    notFound();
  }

  let parsedImages = [];
  try {
    parsedImages = JSON.parse(product.images);
  } catch (e) {
    parsedImages = [product.images];
  }

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#29241F] pb-6">
          <div className="space-y-1">
            <Link href="/admin/products" className="text-xs uppercase tracking-widest text-[#A0988E] hover:text-[#D4AF37] flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Catalog
            </Link>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">
              Edit Fragrance: {product.name}
            </h1>
          </div>
        </div>

        <AdminProductEditForm
          product={{
            ...product,
            images: parsedImages,
          }}
        />
      </main>
    </div>
  );
}
