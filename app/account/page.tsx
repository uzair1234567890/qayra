'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Package, MapPin, Phone, Mail, LogOut, CheckCircle2, Clock, ShieldCheck, ArrowRight, Truck } from 'lucide-react';

export default function CustomerAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [userRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/user/orders'),
      ]);

      const userData = await userRes.json();
      const ordersData = await ordersRes.json();

      if (!userData.user) {
        router.push('/login');
        return;
      }

      setUser(userData.user);
      setName(userData.user.name || '');
      setPhone(userData.user.phone || '');
      setShippingAddress(userData.user.shippingAddress || '');
      setCity(userData.user.city || '');
      setState(userData.user.state || '');
      setPincode(userData.user.pincode || '');

      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error(err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, shippingAddress, city, state, pincode }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setEditMode(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#A0988E]">Loading Qayra Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#C5A059] flex items-center justify-center text-[#0A0908] font-bold font-serif text-2xl shadow-xl shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'Q'}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold block">
              VIP Qayra Club Member
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#FDFBF7]">
              {user.name}
            </h1>
            <p className="text-xs text-[#A0988E] mt-0.5">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2.5 bg-[#1A1815] border border-[#29241F] hover:border-red-500/40 text-xs font-semibold text-[#A0988E] hover:text-red-400 rounded-lg flex items-center space-x-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#29241F] space-x-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-[#D4AF37] text-[#D4AF37]'
              : 'border-transparent text-[#787063] hover:text-[#FDFBF7]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order History ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-[#D4AF37] text-[#D4AF37]'
              : 'border-transparent text-[#787063] hover:text-[#FDFBF7]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Saved Addresses & Profile</span>
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-10 text-center space-y-4">
              <Package className="w-12 h-12 text-[#787063] mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-[#FDFBF7]">No Orders Placed Yet</h3>
                <p className="text-xs text-[#A0988E]">
                  Discover your signature 30-day luxury car diffuser today.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl hover:brightness-110 transition-all"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#141210] border border-[#29241F] rounded-xl p-5 sm:p-6 space-y-4 hover:border-[#D4AF37]/40 transition-all shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#29241F]">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-serif text-lg font-bold text-[#FDFBF7]">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#787063] mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-serif text-xl font-bold text-[#D4AF37]">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-[#A0988E] flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3 text-[#D4AF37]" /> Status: <strong className="text-[#FDFBF7] uppercase">{order.orderStatus}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3 text-xs">
                        <div className="w-10 h-10 rounded bg-[#1A1815] border border-[#29241F] relative overflow-hidden shrink-0">
                          {item.productImage && (
                            <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-bold text-[#FDFBF7] truncate">{item.productName}</p>
                          <p className="text-[10px] text-[#787063]">Qty: {item.quantity} &times; ₹{item.price.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Address */}
                  <div className="pt-3 border-t border-[#29241F] text-[11px] text-[#A0988E] flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>
                      Deliver to: <strong>{order.customerName}</strong> ({order.shippingAddress}, {order.city}, {order.state} - {order.pincode})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#FDFBF7]">
              Customer Details & Shipping Address
            </h3>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-[#1A1815] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold rounded-lg hover:bg-[#D4AF37]/10 transition-all"
              >
                Edit Details
              </button>
            ) : (
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-[#1A1815] border border-[#29241F] text-[#A0988E] text-xs font-semibold rounded-lg hover:text-[#FDFBF7]"
              >
                Cancel
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg text-center font-medium flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Shipping address saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  disabled={!editMode}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#787063] opacity-60 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Phone Number</label>
                <input
                  type="tel"
                  disabled={!editMode}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">PIN Code</label>
                <input
                  type="text"
                  disabled={!editMode}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="560001"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">Default Delivery Address</label>
              <input
                type="text"
                disabled={!editMode}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="House/Flat No., Street, Area"
                className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">City</label>
                <input
                  type="text"
                  disabled={!editMode}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#A0988E] mb-1 font-medium">State</label>
                <input
                  type="text"
                  disabled={!editMode}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg px-3.5 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] disabled:opacity-60 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {editMode && (
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl hover:brightness-110 transition-all"
              >
                Save Delivery Profile
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
