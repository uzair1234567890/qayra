'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, ArrowLeft, CheckCircle2, Lock, Sparkles, CreditCard } from 'lucide-react';
import { useCart } from '@/components/CartContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCart();
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Coupon discount calculation
  let discountPct = 0;
  if (appliedCoupon === 'ROYAL15') discountPct = 0.15;
  if (appliedCoupon === 'EXECUTIVE20') discountPct = 0.20;

  const discountAmount = Math.round(subtotal * discountPct);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const FREE_SHIPPING_THRESHOLD = 1499;
  const shippingFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 99;
  const totalAmount = discountedSubtotal + shippingFee;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();

    if (code === 'ROYAL15' || code === 'EXECUTIVE20') {
      setAppliedCoupon(code);
      setCouponInput('');
    } else {
      setCouponError('Invalid coupon code. Try ROYAL15 for 15% OFF.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponError('');
  };

  // Load Razorpay JS SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleCheckoutSubmit = async (e?: React.FormEvent, isSimulatorMode = false) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !pincode) {
      setErrorMessage('Please fill in all required shipping address fields (Name, Email, Mobile Number, Address, and Pincode).');
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Your perfume cart is empty.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create order in DB and get Razorpay Order details
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          city,
          state,
          pincode,
          couponCode: appliedCoupon,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize order');
      }

      const { order, razorpayOrderId, amountPaise, currency, razorpayKeyId } = data;

      // 2. Simulator mode or standard Razorpay checkout modal
      if (isSimulatorMode || !window.Razorpay || razorpayKeyId.includes('MockKey')) {
        console.log('[SIMULATOR] Processing test payment verification...');
        const verifyRes = await fetch('/api/checkout/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            isMockPayment: true,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          clearCart();
          router.push(`/orders/${order.orderNumber}`);
        } else {
          throw new Error(verifyData.error || 'Payment verification failed');
        }
      } else {
        // Standard Razorpay JS Modal
        const options = {
          key: razorpayKeyId,
          amount: amountPaise,
          currency: currency || 'INR',
          name: 'Qayra Luxury Fragrance',
          description: `Order #${order.orderNumber}`,
          image: '/images/products/oud_nocturne.jpg',
          order_id: razorpayOrderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/checkout/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: order.id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                clearCart();
                router.push(`/orders/${order.orderNumber}`);
              } else {
                setErrorMessage('Payment verification failed. Please contact support.');
              }
            } catch (err) {
              console.error('Error verifying payment:', err);
              setErrorMessage('An error occurred while confirming your payment.');
            }
          },
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: {
            color: '#D4AF37',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setErrorMessage(response.error.description || 'Payment process failed.');
        });
        rzp.open();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">Your Shopping Cart is Empty</h1>
        <p className="text-xs text-[#A0988E]">Add a luxury car perfume to proceed with checkout.</p>
        <Link
          href="/products"
          className="inline-block px-6 py-3 bg-[#D4AF37] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded"
        >
          Browse Perfume Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#29241F] pb-6">
        <Link
          href="/products"
          className="text-xs uppercase tracking-widest text-[#A0988E] hover:text-[#D4AF37] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        <div className="flex items-center space-x-2 text-xs text-[#D4AF37]">
          <Lock className="w-4 h-4" />
          <span className="font-medium uppercase tracking-widest">256-Bit Encrypted Secure Checkout</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] text-xs rounded font-medium">
          {errorMessage}
        </div>
      )}

      {/* Main Checkout Form Grid */}
      <form onSubmit={(e) => handleCheckoutSubmit(e, false)} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left 7 Columns: Shipping Details */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 sm:p-8 space-y-6">
            <h2 className="font-serif text-2xl font-bold text-[#FDFBF7] uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#D4AF37]" />
              <span>Shipping & Delivery Details</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#A0988E] font-medium uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uzair Khan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#A0988E] font-medium uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. uzair@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A0988E] font-medium uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#A0988E] font-medium uppercase tracking-wider">Street / Apartment Address *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="House/Flat No., Building Name, Street"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none placeholder-[#787063]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#A0988E] font-medium uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#A0988E] font-medium uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#A0988E] font-medium uppercase tracking-wider">Pincode *</label>
                  <input
                    type="text"
                    required
                    placeholder="400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2.5 rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Order Summary & Payment Button */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 space-y-6 sticky top-28 shadow-xl">
            <h2 className="font-serif text-xl font-bold text-[#FDFBF7] uppercase tracking-wider border-b border-[#29241F] pb-4">
              Order Summary ({cart.length})
            </h2>

            {/* Selected Items */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-2 border-b border-[#29241F]/60">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded bg-[#0A0908] border border-[#29241F] overflow-hidden flex-shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-[#FDFBF7] text-sm">{item.name}</p>
                      <p className="text-[10px] text-[#D4AF37] uppercase">{item.scentFamily}</p>
                      <p className="text-[11px] text-[#787063]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-[#D4AF37]">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <div className="pt-2 border-t border-[#29241F] space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#A0988E] font-semibold">Have a Promo Coupon?</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-[#1A1815] border border-[#52B788]/40 p-2.5 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#52B788]" />
                    <span className="font-mono text-[#52B788] font-bold">{appliedCoupon}</span>
                    <span className="text-[10px] text-[#A0988E]">({appliedCoupon === 'ROYAL15' ? '15%' : '20%'} OFF Applied)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[10px] text-[#E63946] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter ROYAL15"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2 rounded focus:outline-none uppercase placeholder-[#787063]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-[#1A1815] hover:bg-[#D4AF37] border border-[#C5A059]/40 hover:border-[#D4AF37] text-[#D4AF37] hover:text-[#0A0908] text-xs font-semibold uppercase tracking-wider rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-[10px] text-[#E63946] font-medium">{couponError}</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 text-xs border-t border-[#29241F] pt-4">
              <div className="flex justify-between text-[#A0988E]">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#52B788] font-medium">
                  <span>Promo Discount ({appliedCoupon})</span>
                  <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-[#A0988E]">
                <span>India Express Delivery</span>
                <span className="text-[#D4AF37] font-medium">
                  {shippingFee === 0 ? 'FREE' : '₹99'}
                </span>
              </div>
              <div className="flex justify-between font-serif text-lg font-bold text-[#FDFBF7] pt-2 border-t border-[#29241F]">
                <span>Total Due</span>
                <span className="text-[#D4AF37]">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{loading ? 'Processing...' : 'Pay via Razorpay'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckoutSubmit(undefined, true)}
                disabled={loading}
                className="w-full py-3 bg-[#1A1815] hover:bg-[#25201B] border border-[#C5A059]/40 text-[#D4AF37] font-semibold text-[11px] uppercase tracking-widest rounded flex items-center justify-center space-x-2 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Mode: Complete Order Instantly</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
