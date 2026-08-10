'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, User, Phone, MapPin, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { email, password, name, phone, shippingAddress, city, state, pincode }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessMsg(isRegister ? 'Account created successfully! Redirecting...' : 'Welcome back! Redirecting...');
      setTimeout(() => {
        router.push('/account');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tab Switcher */}
        <div className="flex bg-[#1A1815] p-1 rounded-xl border border-[#29241F]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] shadow-md'
                : 'text-[#A0988E] hover:text-[#FDFBF7]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] shadow-md'
                : 'text-[#A0988E] hover:text-[#FDFBF7]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Qayra Club Privé</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#FDFBF7]">
            {isRegister ? 'Join Qayra Society' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[#A0988E]">
            {isRegister
              ? 'Create your account to manage orders, save delivery preferences & unlock exclusive member benefits.'
              : 'Sign in to access your order history, shipping details & exclusive VIP rewards.'}
          </p>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg text-center font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg text-center font-medium flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-medium text-[#A0988E] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#787063] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lord Sterling"
                  className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#A0988E] mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#787063] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vip@qayra.com"
                className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#A0988E] mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#787063] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-[#A0988E] mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#787063] absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#A0988E] mb-1">
                  Default Delivery Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#787063] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Suite 402, Sterling Towers, MG Road"
                    className="w-full bg-[#1A1815] border border-[#29241F] rounded-lg pl-9 pr-4 py-2.5 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="bg-[#1A1815] border border-[#29241F] rounded-lg px-3 py-2 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="bg-[#1A1815] border border-[#29241F] rounded-lg px-3 py-2 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                />
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="PIN"
                  className="bg-[#1A1815] border border-[#29241F] rounded-lg px-3 py-2 text-xs text-[#FDFBF7] placeholder-[#524B43] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded-lg flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-80 mt-2"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#29241F]">
          <Link
            href="/admin/login"
            className="text-[11px] text-[#787063] hover:text-[#D4AF37] transition-colors"
          >
            Are you a Store Administrator? Sign in to Admin Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
