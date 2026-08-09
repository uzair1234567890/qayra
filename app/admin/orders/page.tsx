import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';
import AdminOrderRow from './AdminOrderRow';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const orders = await prisma.order.findMany({
    include: {
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#29241F] pb-6">
          <div>
            <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.25em]">
              Fulfillment Operations
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">
              Customer Orders ({orders.length})
            </h1>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#141210] border border-[#29241F] rounded-xl overflow-hidden shadow-xl">
          {orders.length === 0 ? (
            <p className="text-xs text-[#787063] py-12 text-center">No orders created in the system yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1A1815] text-[#A0988E] uppercase tracking-wider border-b border-[#29241F]">
                  <tr>
                    <th className="p-4">Order Details</th>
                    <th className="p-4">Customer & Address</th>
                    <th className="p-4">Order Items</th>
                    <th className="p-4">Total Paid</th>
                    <th className="p-4">Payment Status</th>
                    <th className="p-4">Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#29241F] text-[#FDFBF7]">
                  {orders.map((ord) => (
                    <AdminOrderRow key={ord.id} order={ord} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
