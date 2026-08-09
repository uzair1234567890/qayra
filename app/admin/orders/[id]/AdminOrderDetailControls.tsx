'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw } from 'lucide-react';

interface AdminOrderDetailControlsProps {
  orderId: string;
  initialOrderStatus: string;
  initialPaymentStatus: string;
}

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];

export default function AdminOrderDetailControls({
  orderId,
  initialOrderStatus,
  initialPaymentStatus,
}: AdminOrderDetailControlsProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
        }),
      });

      if (res.ok) {
        setMessage('Order status updated successfully.');
        router.refresh();
      } else {
        alert('Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#141210] border border-[#29241F] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
      <div className="space-y-1">
        <h3 className="font-serif text-lg font-bold text-[#FDFBF7] uppercase tracking-wider">
          Order Status Controls
        </h3>
        <p className="text-xs text-[#A0988E]">
          Update order fulfillment phase and verified payment status.
        </p>
        {message && <span className="text-xs text-[#2A9D8F] font-semibold block pt-1">{message}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
        <div className="space-y-1">
          <label className="text-[10px] text-[#787063] uppercase tracking-wider block font-bold">Fulfillment Status</label>
          <select
            value={orderStatus}
            disabled={loading}
            onChange={(e) => setOrderStatus(e.target.value)}
            className="bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3 py-2 rounded focus:outline-none uppercase font-bold"
          >
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-[#787063] uppercase tracking-wider block font-bold">Payment Status</label>
          <select
            value={paymentStatus}
            disabled={loading}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#D4AF37] px-3 py-2 rounded focus:outline-none uppercase font-bold"
          >
            {PAYMENT_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="self-end px-5 py-2 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-widest rounded flex items-center space-x-1.5 transition-all shadow-md disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
