'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';

export default function AdminProductActions({ productId, productName }: { productId: string; productName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${productName}" from the database?`)) {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          router.refresh();
        } else {
          alert('Failed to delete product.');
        }
      } catch (err) {
        console.error('Error deleting product:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Link
        href={`/admin/products/${productId}/edit`}
        className="p-1.5 bg-[#1A1815] hover:bg-[#D4AF37] border border-[#29241F] hover:border-[#D4AF37] text-[#A0988E] hover:text-[#0A0908] rounded transition-colors"
        title="Edit Fragrance Details"
      >
        <Edit className="w-3.5 h-3.5" />
      </Link>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-1.5 bg-[#1A1815] hover:bg-[#E63946] border border-[#29241F] hover:border-[#E63946] text-[#A0988E] hover:text-[#FDFBF7] rounded transition-colors disabled:opacity-50"
        title="Delete Fragrance"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
