'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { label: 'Overview Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Product Inventory', href: '/admin/products', icon: Package },
    { label: 'Customer Orders', href: '/admin/orders', icon: ShoppingCart },
  ];

  return (
    <aside className="w-64 bg-[#141210] border-r border-[#29241F] min-h-screen p-6 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-8">
        {/* Brand Admin Title */}
        <div className="space-y-1 pb-6 border-b border-[#29241F]">
          <span className="text-2xl font-serif tracking-[0.25em] text-[#FDFBF7] font-bold uppercase">
            QAYRA
          </span>
          <span className="block text-[9px] uppercase tracking-[0.3em] text-[#D4AF37]">
            Admin Portal & Database
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#D4AF37] text-[#0A0908] font-bold shadow-lg'
                    : 'text-[#B5AC9E] hover:bg-[#1A1815] hover:text-[#FDFBF7]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="space-y-4 pt-6 border-t border-[#29241F]">
        <Link
          href="/"
          className="flex items-center space-x-2 text-xs text-[#A0988E] hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View Public Storefront</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-4 py-2.5 bg-[#1A1815] hover:bg-[#E63946]/20 border border-[#29241F] hover:border-[#E63946] text-[#E63946] rounded text-xs font-semibold uppercase tracking-wider transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
}
