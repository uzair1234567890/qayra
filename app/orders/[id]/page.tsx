import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, PackageCheck, Truck, ShieldCheck, Clock, ArrowRight, MessageCircle, Smartphone, Banknote, AlertCircle } from 'lucide-react';
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
  const isPrepaid = order.paymentMethod === 'PREPAID';
  const isCOD = order.paymentMethod === 'COD';

  const whatsappMessage = encodeURIComponent(
    `Hi Qayra Parfums, I have placed prepaid order #${order.orderNumber} for ₹${order.totalAmount}. Please share the UPI payment QR / details so I can complete payment.`
  );
  const whatsappUrl = `https://wa.me/918369389278?text=${whatsappMessage}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 space-y-10">
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
            Your luxury car fragrance order has been received. An email receipt has been sent to{' '}
            <span className="text-[#FDFBF7] font-medium">{order.customerEmail}</span>.
          </p>
        </div>

        <div className="inline-flex items-center space-x-3 bg-[#1A1815] border border-[#C5A059]/40 px-4 py-2 rounded-full text-xs font-mono text-[#D4AF37]">
          <span>Order Number:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
      </div>

      {/* Prepaid WhatsApp Payment Alert Box */}
      {isPrepaid && (
        <div className="bg-gradient-to-r from-[#141F16] via-[#1A2E1D] to-[#141F16] border-2 border-[#25D366]/40 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#25D366]/20 border border-[#25D366]/50 rounded-xl text-[#25D366]">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#25D366] font-bold">
                Action Required &bull; Prepaid Order
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#FDFBF7]">
                Payment will be collected on WhatsApp
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#D6D0C7] leading-relaxed">
            Our customer concierge team will connect with you shortly on WhatsApp at{' '}
            <strong className="text-[#25D366] font-mono">{order.customerPhone || 'your registered mobile number'}</strong>{' '}
            with the UPI payment link / QR code to complete your payment of{' '}
            <strong className="text-[#D4AF37]">₹{order.totalAmount.toLocaleString('en-IN')}</strong>. Once payment is verified, your order will be dispatched immediately.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-[#0A0908] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-[#0A0908]" />
              <span>Open WhatsApp to Pay (₹{order.totalAmount.toLocaleString('en-IN')})</span>
            </a>
            <span className="text-[11px] text-[#A0988E]">
              Or wait for our team to message you on WhatsApp.
            </span>
          </div>
        </div>
      )}

      {/* COD Notice Box */}
      {isCOD && (
        <div className="bg-[#141210] border border-[#E69A28]/40 rounded-xl p-5 flex items-start space-x-3.5">
          <div className="p-2.5 bg-[#E69A28]/10 rounded-lg text-[#E69A28] shrink-0 mt-0.5">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-serif font-bold text-[#FDFBF7] text-sm">Cash on Delivery (COD) Order</h4>
            <p className="text-[#A0988E] leading-relaxed">
              Please keep <strong className="text-[#D4AF37]">₹{order.totalAmount.toLocaleString('en-IN')}</strong> in cash ready when the delivery executive arrives at your address. Includes ₹50 COD handling fee.
            </p>
          </div>
        </div>
      )}

      {/* Shipment Tracker Visual Timeline */}
      <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-8 space-y-6">
        <h3 className="font-serif text-lg font-bold text-[#FDFBF7] uppercase tracking-wider">
          Fulfillment Status Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          <div className={`p-4 rounded-lg border text-center space-y-2 ${isPaid || order.orderStatus === 'PROCESSING' ? 'bg-[#1A1815] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141210] border-[#29241F] text-[#787063]'}`}>
            <Clock className="w-5 h-5 mx-auto" />
            <div className="text-xs font-serif font-bold uppercase">1. Order Placed</div>
            <div className="text-[10px] text-[#A0988E]">{isPaid ? 'Payment Received' : isPrepaid ? 'WhatsApp Payment' : 'Cash on Arrival'}</div>
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
              {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : isPrepaid ? '📱 Prepaid (WhatsApp)' : '💳 Online Payment'}
            </span>
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              isPaid
                ? 'bg-[#2A9D8F]/10 border border-[#2A9D8F]/40 text-[#2A9D8F]'
                : isPrepaid
                ? 'bg-[#25D366]/10 border border-[#25D366]/40 text-[#25D366]'
                : 'bg-[#E69A28]/10 border border-[#E69A28]/40 text-[#E69A28]'
            }`}>
              {isPaid ? 'Payment Confirmed' : isPrepaid ? 'Payment via WhatsApp' : 'Pay Cash on Arrival'}
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
              <span>Payment Method</span>
              <span className="text-[#FDFBF7] font-medium">
                {isCOD ? 'Cash on Delivery (COD)' : isPrepaid ? 'Prepaid (WhatsApp)' : 'Online Payment'}
              </span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between text-[#52B788] font-medium">
                <span>Coupon ({order.couponCode})</span>
                <span>Applied</span>
              </div>
            )}
            <div className="flex justify-between text-[#52B788] font-medium">
              <span>Express Delivery</span>
              <span>FREE</span>
            </div>
            {isCOD ? (
              <div className="flex justify-between text-[#E69A28] font-medium">
                <span>COD Handling Fee</span>
                <span>+₹50</span>
              </div>
            ) : (
              <div className="flex justify-between text-[#52B788] font-medium">
                <span>Prepaid Handling Fee</span>
                <span>FREE (₹0)</span>
              </div>
            )}
            <div className="flex justify-between font-serif text-base font-bold text-[#FDFBF7] pt-2 border-t border-[#29241F]">
              <span>Total Payable</span>
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
