import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, User, MapPin, CreditCard, ShoppingBag, Truck, Calendar, Phone, Mail, ShieldCheck } from 'lucide-react';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';
import AdminOrderDetailControls from './AdminOrderDetailControls';

export const revalidate = 0;

interface AdminOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = order.totalAmount >= 1499 ? 0 : 99;

  return (
    <div className="flex min-h-screen bg-[#0A0908]">
      <AdminSidebar />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#29241F] pb-6 gap-4">
          <div className="space-y-1">
            <Link
              href="/admin/orders"
              className="text-xs uppercase tracking-widest text-[#A0988E] hover:text-[#D4AF37] flex items-center gap-1.5 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Orders
            </Link>
            <div className="flex items-center space-x-3 pt-1">
              <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-[#2A9D8F]/15 border border-[#2A9D8F]/40 text-[#2A9D8F]'
                    : 'bg-[#E69A28]/15 border border-[#E69A28]/40 text-[#E69A28]'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/orders/${order.orderNumber}`}
              target="_blank"
              className="px-4 py-2.5 bg-[#1A1815] hover:bg-[#25201B] border border-[#29241F] hover:border-[#D4AF37] text-[#FDFBF7] text-xs font-semibold uppercase tracking-wider rounded transition-all flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Customer Receipt View</span>
            </Link>
          </div>
        </div>

        {/* Live Status Controls */}
        <AdminOrderDetailControls
          orderId={order.id}
          initialOrderStatus={order.orderStatus}
          initialPaymentStatus={order.paymentStatus}
        />

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
          {/* Customer & Shipping Details */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center space-x-2 text-[#D4AF37] border-b border-[#29241F] pb-3">
              <User className="w-4 h-4" />
              <h3 className="font-serif text-base font-bold text-[#FDFBF7] uppercase tracking-wider">
                Customer & Shipping Address
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Customer Name</span>
                  <span className="text-[#FDFBF7] font-semibold text-sm">{order.customerName}</span>
                </div>
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Mobile / Phone</span>
                  <span className="text-[#D4AF37] font-mono font-semibold text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {order.customerPhone || 'Not provided'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Email Address</span>
                <span className="text-[#FDFBF7] font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#A0988E]" />
                  {order.customerEmail}
                </span>
              </div>

              <div className="pt-2 border-t border-[#29241F] space-y-1">
                <span className="text-[#787063] uppercase tracking-wider block text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#D4AF37]" /> Street Delivery Address
                </span>
                <p className="text-[#FDFBF7] leading-relaxed bg-[#1A1815] p-3 rounded border border-[#29241F]">
                  {order.shippingAddress}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-[#A0988E]">
                  <div><span className="text-[#787063]">City:</span> {order.city}</div>
                  <div><span className="text-[#787063]">State:</span> {order.state}</div>
                  <div><span className="text-[#787063]">Pincode:</span> {order.pincode}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & System Details */}
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center space-x-2 text-[#D4AF37] border-b border-[#29241F] pb-3">
              <CreditCard className="w-4 h-4" />
              <h3 className="font-serif text-base font-bold text-[#FDFBF7] uppercase tracking-wider">
                Payment & Transaction Reference
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Payment Status</span>
                  <span className="text-[#D4AF37] font-bold text-sm">{order.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Order Date & Time</span>
                  <span className="text-[#A0988E] font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#29241F]">
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Razorpay Order ID</span>
                  <span className="text-[#FDFBF7] font-mono text-xs">{order.razorpayOrderId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#787063] uppercase tracking-wider block text-[10px]">Razorpay Payment ID</span>
                  <span className="text-[#FDFBF7] font-mono text-xs">{order.razorpayPaymentId || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-[#D4AF37] border-b border-[#29241F] pb-4">
            <ShoppingBag className="w-5 h-5" />
            <h3 className="font-serif text-lg font-bold text-[#FDFBF7] uppercase tracking-wider">
              Purchased Perfume Vials ({order.items.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A1815] text-[#A0988E] uppercase tracking-wider border-b border-[#29241F]">
                <tr>
                  <th className="p-3">Product Vial</th>
                  <th className="p-3">Scent Family</th>
                  <th className="p-3">Price Per Unit</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#29241F] text-[#FDFBF7]">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1A1815]/50">
                    <td className="p-3 flex items-center space-x-3">
                      <div className="relative w-12 h-12 rounded bg-[#0A0908] border border-[#29241F] overflow-hidden flex-shrink-0">
                        <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-[#FDFBF7]">{item.productName}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] text-[#D4AF37] uppercase font-bold bg-[#1A1815] px-2 py-0.5 rounded border border-[#C5A059]/30">
                        {item.product?.scentFamily || 'Car Fragrance'}
                      </span>
                    </td>
                    <td className="p-3 font-mono">₹{item.price.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-semibold">{item.quantity}</td>
                    <td className="p-3 text-right font-serif font-bold text-sm text-[#D4AF37]">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="pt-4 border-t border-[#29241F] flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-[#A0988E]">
                <span>Items Subtotal</span>
                <span className="text-[#FDFBF7]">₹{itemsSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#A0988E]">
                <span>India Express Delivery</span>
                <span className="text-[#D4AF37] font-medium">{shippingFee === 0 ? 'FREE' : '₹99'}</span>
              </div>
              <div className="flex justify-between font-serif text-lg font-bold text-[#FDFBF7] pt-2 border-t border-[#29241F]">
                <span>Grand Total Paid</span>
                <span className="text-[#D4AF37]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
