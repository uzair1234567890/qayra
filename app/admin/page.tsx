import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IndianRupee, ShoppingBag, Package, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch metrics data concurrently for maximum execution speed
  const [
    revenueResult,
    totalOrdersCount,
    pendingOrdersCount,
    totalProductsCount,
    activeProductsCount,
    lowStockProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'PAID' },
    }),
    prisma.order.count(),
    prisma.order.count({
      where: { orderStatus: { in: ['PENDING', 'PROCESSING'] } },
    }),
    prisma.product.count(),
    prisma.product.count({
      where: { isActive: true },
    }),
    prisma.product.findMany({
      where: { stock: { lte: 15 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: 'asc' },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPaidRevenue = revenueResult._sum.totalAmount || 0;

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Top Greeting Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#29241F] pb-6">
          <div>
            <span className="text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.25em]">
              Executive Overview
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">
              Welcome Back, {admin.email.split('@')[0]}
            </h1>
          </div>

          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded shadow-lg hover:brightness-110 transition-all"
          >
            + Create New Perfume
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Paid Revenue */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#A0988E] font-medium">Total Paid Revenue</span>
              <div className="p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-[#D4AF37]">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="font-serif text-3xl font-bold text-[#D4AF37]">
              ₹{totalPaidRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-[#787063] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#2A9D8F]" /> Verified Razorpay transactions
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#A0988E] font-medium">Total Orders</span>
              <div className="p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-[#D4AF37]">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="font-serif text-3xl font-bold text-[#FDFBF7]">
              {totalOrdersCount}
            </div>
            <p className="text-[11px] text-[#787063]">
              {pendingOrdersCount} pending dispatch
            </p>
          </div>

          {/* Active Perfumes */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#A0988E] font-medium">Perfume Vials</span>
              <div className="p-2 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-[#D4AF37]">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="font-serif text-3xl font-bold text-[#FDFBF7]">
              {totalProductsCount}
            </div>
            <p className="text-[11px] text-[#787063]">
              {activeProductsCount} active in storefront
            </p>
          </div>

          {/* Low Stock Warning */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#A0988E] font-medium">Low Stock Alerts</span>
              <div className="p-2 bg-[#E69A28]/10 rounded border border-[#E69A28]/30 text-[#E69A28]">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="font-serif text-3xl font-bold text-[#E69A28]">
              {lowStockProducts.length}
            </div>
            <p className="text-[11px] text-[#787063]">
              Products below 15 units threshold
            </p>
          </div>
        </div>

        {/* Low Stock Warning Banner */}
        {lowStockProducts.length > 0 && (
          <div className="bg-[#1A1815] border border-[#E69A28]/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-[#E69A28]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold uppercase tracking-wider">
                Low Inventory Warning ({lowStockProducts.length} Products)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {lowStockProducts.map((prod) => (
                <div key={prod.id} className="p-3 bg-[#141210] border border-[#29241F] rounded flex justify-between items-center">
                  <span className="font-serif font-bold text-[#FDFBF7]">{prod.name}</span>
                  <span className="text-[#E69A28] font-bold">{prod.stock} left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders Overview */}
        <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#29241F] pb-4">
            <h3 className="font-serif text-xl font-bold text-[#FDFBF7] uppercase tracking-wider">
              Recent Customer Orders
            </h3>
            <Link href="/admin/orders" className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
              <span>View All Orders</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-[#787063] py-8 text-center">No customer orders placed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1A1815] text-[#A0988E] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Fulfillment Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#29241F] text-[#FDFBF7]">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#1A1815]/50">
                      <td className="p-3 font-mono text-[#D4AF37] font-bold">{ord.orderNumber}</td>
                      <td className="p-3 font-medium">{ord.customerName}</td>
                      <td className="p-3 font-serif font-bold text-[#D4AF37]">₹{ord.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ord.paymentStatus === 'PAID' ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]' : 'bg-[#E69A28]/20 text-[#E69A28]'}`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#A0988E]">{ord.orderStatus}</td>
                      <td className="p-3 text-[#787063]">{new Date(ord.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
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
