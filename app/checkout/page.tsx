'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Truck,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  CreditCard,
  Banknote,
  Tag,
  Check,
  Smartphone,
  Info,
} from 'lucide-react';
import { useCart } from '@/components/CartContext';

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

  const [paymentMethod, setPaymentMethod] = useState<'PREPAID' | 'COD'>('PREPAID');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill address details if customer is logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCustomerName(data.user.name || '');
          setCustomerEmail(data.user.email || '');
          setCustomerPhone(data.user.phone || '');
          setShippingAddress(data.user.shippingAddress || '');
          setCity(data.user.city || '');
          setState(data.user.state || '');
          setPincode(data.user.pincode || '');
        }
      })
      .catch(() => {});
  }, []);

  // Coupon discount calculation: ROYAL15 = 10%, EXECUTIVE20 = 20%
  let discountPct = 0;
  if (appliedCoupon === 'ROYAL15') discountPct = 0.10;
  if (appliedCoupon === 'EXECUTIVE20') discountPct = 0.20;

  const discountAmount = Math.round(subtotal * discountPct);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Cash on delivery fee is ₹50; Prepaid is ₹0 free delivery
  const codFee = paymentMethod === 'COD' ? 50 : 0;
  const totalAmount = discountedSubtotal + codFee;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setCouponLoading(true);

    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email: customerEmail,
          phone: customerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setCouponError(data.error || 'Invalid coupon code. Try ROYAL15 for 10% OFF.');
      } else {
        setAppliedCoupon(data.code);
        setCouponInput('');
        setCouponError('');
      }
    } catch {
      // Fallback local check
      if (code === 'ROYAL15' || code === 'EXECUTIVE20') {
        setAppliedCoupon(code);
        setCouponInput('');
      } else {
        setCouponError('Invalid coupon code. Try ROYAL15 for 10% OFF.');
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponError('');
  };

  const handleCheckoutSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!cart.length) {
      setErrorMessage('Your bag is currently empty.');
      return;
    }

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !pincode) {
      setErrorMessage('Please fill in all required shipping details.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create order on backend
      const res = await fetch('/api/checkout/create-order', {
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
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate order.');
      }

      // 2. Handle Prepaid (WhatsApp Payment) & Cash on Delivery (COD)
      clearCart();
      if (paymentMethod === 'PREPAID' || data.isPrepaid) {
        router.push(`/orders/${data.order.id}?status=success&method=prepaid`);
      } else {
        router.push(`/orders/${data.order.id}?status=success&method=cod`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error processing checkout. Please try again.');
      setLoading(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <h1 className="font-serif text-3xl font-bold text-[#FDFBF7]">Your Bag is Empty</h1>
        <p className="text-xs text-[#A0988E]">
          Explore our handcrafted 30-day luxury car diffusers to continue.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl hover:brightness-110 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Collections</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#29241F] pb-4">
        <Link href="/" className="inline-flex items-center space-x-2 text-xs text-[#A0988E] hover:text-[#D4AF37] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Store</span>
        </Link>
        <div className="flex items-center space-x-2 text-[#D4AF37] text-xs font-semibold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted Checkout</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Shipping & Payment Method Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {/* Step 1: Contact & Delivery Address */}
            <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl">
              <h2 className="font-serif text-xl font-bold text-[#FDFBF7] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A0908] text-xs font-bold font-sans flex items-center justify-center">1</span>
                <span>Delivery Address</span>
              </h2>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Sterling Vance"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="sterling@example.com"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Mobile Number (For WhatsApp / Delivery) *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560001"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Flat / House No. & Street Address *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Suite 402, Sterling Towers, MG Road"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Karnataka"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Payment Method Selection */}
            <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
              <h2 className="font-serif text-xl font-bold text-[#FDFBF7] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A0908] text-xs font-bold font-sans flex items-center justify-center">2</span>
                <span>Select Payment Method</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Option 1: Prepaid (WhatsApp Payment) */}
                <div
                  onClick={() => setPaymentMethod('PREPAID')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative ${
                    paymentMethod === 'PREPAID'
                      ? 'border-[#D4AF37] bg-[#1A1815] ring-1 ring-[#D4AF37] shadow-lg'
                      : 'border-[#29241F] bg-[#141210] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center space-x-2.5">
                      <Smartphone className="w-5 h-5 text-[#25D366]" />
                      <div>
                        <span className="font-serif font-bold text-sm text-[#FDFBF7] block">Prepaid (UPI / QR)</span>
                        <span className="text-[10px] text-[#52B788] font-semibold">✨ Free Express Delivery &bull; ₹0 COD Fee</span>
                      </div>
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        paymentMethod === 'PREPAID'
                          ? 'bg-[#D4AF37] text-[#0A0908]'
                          : 'border border-[#787063]'
                      }`}
                    >
                      {paymentMethod === 'PREPAID' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0988E] leading-relaxed">
                    Payment link / UPI QR code will be shared on your <strong>WhatsApp</strong> after placing the order.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#25D366] bg-[#25D366]/10 px-2 py-1 rounded">
                    <span>📱 Verified Payment via WhatsApp</span>
                  </div>
                </div>

                {/* Option 2: Cash on Delivery (COD) */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative ${
                    paymentMethod === 'COD'
                      ? 'border-[#D4AF37] bg-[#1A1815] ring-1 ring-[#D4AF37] shadow-lg'
                      : 'border-[#29241F] bg-[#141210] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center space-x-2.5">
                      <Banknote className="w-5 h-5 text-[#D4AF37]" />
                      <div>
                        <span className="font-serif font-bold text-sm text-[#FDFBF7] block">Cash on Delivery (COD)</span>
                        <span className="text-[10px] text-[#E69A28] font-semibold">+₹50 Courier COD Handling</span>
                      </div>
                    </div>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        paymentMethod === 'COD'
                          ? 'bg-[#D4AF37] text-[#0A0908]'
                          : 'border border-[#787063]'
                      }`}
                    >
                      {paymentMethod === 'COD' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A0988E] leading-relaxed">
                    Pay in cash directly to the delivery executive upon package arrival at your doorstep.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E69A28] bg-[#E69A28]/10 px-2 py-1 rounded">
                    <span>💵 ₹50 COD Handling Fee Applied</span>
                  </div>
                </div>
              </div>

              {/* Order Submission Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-80 flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'Processing Order...'
                      : paymentMethod === 'PREPAID'
                      ? `Place Prepaid Order (₹${totalAmount.toLocaleString('en-IN')})`
                      : `Place COD Order (₹${totalAmount.toLocaleString('en-IN')})`}
                  </span>
                </button>
                {paymentMethod === 'PREPAID' && (
                  <p className="text-center text-[11px] text-[#A0988E] mt-2 flex items-center justify-center gap-1">
                    <Info className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>Payment will be collected on WhatsApp after placing order.</span>
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Order Summary & Coupon Code */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl sticky top-28">
            <h3 className="font-serif text-xl font-bold text-[#FDFBF7]">Order Summary</h3>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 text-xs">
                  <div className="w-12 h-12 rounded-md bg-[#0A0908] border border-[#29241F] relative overflow-hidden shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-bold text-[#FDFBF7] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#D4AF37] uppercase">{item.scentFamily}</p>
                    <p className="text-[10px] text-[#787063]">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-serif font-bold text-[#FDFBF7]">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <div className="pt-4 border-t border-[#29241F] space-y-2">
              <label className="block text-[11px] font-medium text-[#A0988E] flex items-center justify-between">
                <span>Promo / Coupon Code</span>
                <span className="text-[#D4AF37] text-[10px] uppercase font-bold">Code: ROYAL15 (10% OFF)</span>
              </label>

              {!appliedCoupon ? (
                <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-[#787063] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter ROYAL15"
                      className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-8 pr-3 py-2 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="px-4 py-2 bg-[#1A1815] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#D4AF37] text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-[#D4AF37]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Coupon <strong>{appliedCoupon}</strong> Applied ({discountPct * 100}% OFF)!</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[10px] text-[#A0988E] hover:text-red-400 underline uppercase"
                  >
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[10px] text-red-400 mt-1 font-medium">{couponError}</p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-[#29241F] space-y-2.5 text-xs">
              <div className="flex justify-between text-[#A0988E]">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#52B788] font-medium">
                  <span>Promo Discount ({discountPct * 100}%)</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-[#52B788] font-medium">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Shipping & Handling
                </span>
                <span className="uppercase font-bold tracking-wider">FREE</span>
              </div>

              {paymentMethod === 'COD' ? (
                <div className="flex justify-between text-[#E69A28] font-medium">
                  <span>Cash on Delivery Handling Fee</span>
                  <span>+₹50</span>
                </div>
              ) : (
                <div className="flex justify-between text-[#52B788] font-medium">
                  <span>Prepaid Order Handling</span>
                  <span className="uppercase">₹0 (FREE)</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#29241F] flex justify-between items-baseline font-serif">
                <span className="text-sm font-bold text-[#FDFBF7]">Total Payable</span>
                <span className="text-2xl font-bold text-[#D4AF37]">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Guarantees */}
            <div className="pt-4 border-t border-[#29241F] space-y-2 text-[10px] text-[#A0988E]">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" />
                <span>30-Day Fragrance Longevity Guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" />
                <span>Complimentary Express Shipping Across India</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
