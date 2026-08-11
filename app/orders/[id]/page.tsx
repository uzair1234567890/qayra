import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, PackageCheck, Truck, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';

export const revalidate = 0;

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  const isPaid = order.paymentStatus === 'PAID';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 space-y-12">
      {/* Confirmation Header Banner */}
      <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-8 text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center justify-center p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-full text-[#D4AF37] mb-2">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            Order Confirmation
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7]">
            Thank You, {order.customerName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#A0988E] max-w-md mx-auto">
            Your luxury car fragrance order has been confirmed. An email receipt has been sent to{' '}
            <span className="text-[#FDFBF7] font-medium">{order.customerEmail}</span>.
          </p>
        </div>

        <div className="inline-flex items-center space-x-3 bg-[#1A1815] border border-[#C5A059]/40 px-4 py-2 rounded-full text-xs font-mono text-[#D4AF37]">
          <span>Order Number:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
      </div>

      {/* Shipment Tracker Visual Timeline */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-8 space-y-6">
        <h3 className="font-serif text-lg font-bold text-[#FDFBF7] uppercase tracking-wider">
          Fulfillment Status Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          <div className={`p-4 rounded-lg border text-center space-y-2 ${isPaid ? 'bg-[#1A1815] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141210] border-[#29241F] text-[#787063]'}`}>
            <Clock className="w-5 h-5 mx-auto" />
            <div className="text-xs font-serif font-bold uppercase">1. Order Placed</div>
            <div className="text-[10px] text-[#A0988E]">{isPaid ? 'Payment Received' : 'Pending Payment'}</div>
          </div>

          <div className={`p-4 rounded-lg border text-center space-y-2 ${order.orderStatus === 'PROCESSING' || order.orderStatus === 'SHIPPED' || order.orderStatus === 'DELIVERED' ? 'bg-[#1A1815] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141210] border-[#29241F] text-[#787063]'}`}>
            <PackageCheck className="w-5 h-5 mx-auto" />
            <div className="text-xs font-serif font-bold uppercase">2. Handcrafted</div>
            <div className="text-[10px] text-[#A0988E]">Batch Inspection</div>
          </div>

          <div className={`p-4 rounded-lg border text-center space-y-2 ${order.orderStatus === 'SHIPPED' || order.orderStatus === 'DELIVERED' ? 'bg-[#1A1815] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141210] border-[#29241F] text-[#787063]'}`}>
            <Truck className="w-5 h-5 mx-auto" />
            <div className="text-xs font-serif font-bold uppercase">3. In Transit</div>
            <div className="text-[10px] text-[#A0988E]">India Express</div>
          </div>

          <div className={`p-4 rounded-lg border text-center space-y-2 ${order.orderStatus === 'DELIVERED' ? 'bg-[#1A1815] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141210] border-[#29241F] text-[#787063]'}`}>
            <ShieldCheck className="w-5 h-5 mx-auto" />
            <div className="text-xs font-serif font-bold uppercase">4. Delivered</div>
            <div className="text-[10px] text-[#A0988E]">Ready For Mirror</div>
          </div>
        </div>
      </div>

      {/* Order Invoice Summary */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#29241F] pb-6 gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#FDFBF7]">Purchase Summary</h2>
            <p className="text-xs text-[#787063] mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37]">
              {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Online Payment'}
            </span>
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              isPaid
                ? 'bg-[#2A9D8F]/10 border border-[#2A9D8F]/40 text-[#2A9D8F]'
                : order.paymentMethod === 'COD'
                ? 'bg-[#52B788]/10 border border-[#52B788]/40 text-[#52B788]'
                : 'bg-[#E69A28]/10 border border-[#E69A28]/40 text-[#E69A28]'
            }`}>
              {order.paymentMethod === 'COD' ? 'Pay Cash on Arrival' : order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-[#1A1815] border border-[#29241F] rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16 rounded bg-[#0A0908] border border-[#29241F] overflow-hidden flex-shrink-0">
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#FDFBF7]">{item.productName}</h4>
                  <p className="text-xs text-[#787063]">Quantity: {item.quantity}</p>
                </div>
              </div>

              <span className="font-serif font-bold text-base text-[#D4AF37]">
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>

        {/* Shipping Address & Totals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[#29241F] text-xs">
          <div className="space-y-2 bg-[#1A1815] p-4 rounded-lg border border-[#29241F]">
            <span className="text-[#D4AF37] font-serif font-bold uppercase tracking-wider text-sm block mb-1">
              Destination Address
            </span>
            <p className="text-[#FDFBF7] font-semibold text-sm">{order.customerName}</p>
            <p className="text-[#A0988E] leading-relaxed">{order.shippingAddress}</p>
            <p className="text-[#A0988E]">{order.city}, {order.state} - {order.pincode}</p>
            <p className="text-[#787063] pt-1">Phone: {order.customerPhone || 'N/A'}</p>
          </div>

          <div className="space-y-3 bg-[#1A1815] p-4 rounded-lg border border-[#29241F]">
            <span className="text-[#D4AF37] font-serif font-bold uppercase tracking-wider text-sm block mb-1">
              Payment Details
            </span>
            <div className="flex justify-between text-[#A0988E]">
              <span>Subtotal</span>
              <span className="text-[#FDFBF7]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#52B788] font-medium">
              <span>Express Delivery</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between font-serif text-base font-bold text-[#FDFBF7] pt-2 border-t border-[#29241F]">
              <span>Total Paid</span>
              <span className="text-[#D4AF37]">₹{order.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 px-8 py-3.5 bg-[#141210] hover:bg-[#1A1815] border border-[#29241F] hover:border-[#D4AF37] text-[#FDFBF7] text-xs uppercase tracking-widest font-semibold rounded transition-all"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
        </Link>
      </div>
    </div>
  );
}
