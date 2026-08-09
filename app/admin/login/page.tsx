'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@qayra.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#141210] border border-[#29241F] rounded-2xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-[#1A1815] border border-[#C5A059]/40 rounded-full text-[#D4AF37] mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#FDFBF7] tracking-wider uppercase">
            Qayra Admin Portal
          </h1>
          <p className="text-xs text-[#A0988E]">
            Secure login for product inventory & order management.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#E63946]/10 border border-[#E63946]/30 text-[#E63946] text-xs rounded font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#A0988E] font-medium uppercase tracking-wider">Admin Email</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@qayra.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] pl-10 pr-3 py-3 rounded focus:outline-none placeholder-[#787063]"
              />
              <Mail className="w-4 h-4 text-[#787063] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#A0988E] font-medium uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] pl-10 pr-3 py-3 rounded focus:outline-none placeholder-[#787063]"
              />
              <Lock className="w-4 h-4 text-[#787063] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In To Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Fill Helper */}
        <div className="pt-4 border-t border-[#29241F] text-center">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center space-x-1.5 text-xs text-[#D4AF37] hover:text-[#FDFBF7] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Default Admin Credentials (`admin@qayra.com`)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
