'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

interface AdminOrderRowProps {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    city: string;
    state: string;
    pincode: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    createdAt: Date;
    items: OrderItem[];
  };
}

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];

export default function AdminOrderRow({ order }: AdminOrderRowProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newOrderStatus: string, newPaymentStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: newOrderStatus,
          paymentStatus: newPaymentStatus,
        }),
      });

      if (res.ok) {
        setOrderStatus(newOrderStatus);
        setPaymentStatus(newPaymentStatus);
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
    <tr className="hover:bg-[#1A1815]/50 text-xs">
      <td className="p-4">
        <div className="font-mono text-[#D4AF37] font-bold text-sm">#{order.orderNumber}</div>
        <div className="text-[10px] text-[#787063] mt-0.5">
          {new Date(order.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </td>

      <td className="p-4 space-y-0.5">
        <div className="font-bold text-[#FDFBF7]">{order.customerName}</div>
        <div className="text-[#A0988E] text-[11px]">{order.customerEmail}</div>
        <div className="text-[#787063] text-[10px]">
          {order.shippingAddress}, {order.city} - {order.pincode}
        </div>
      </td>

      <td className="p-4">
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="text-[11px] text-[#B5AC9E]">
              &bull; {item.productName} <span className="text-[#D4AF37] font-semibold">(x{item.quantity})</span>
            </div>
          ))}
        </div>
      </td>

      <td className="p-4 font-serif font-bold text-sm text-[#D4AF37]">
        ₹{order.totalAmount.toLocaleString('en-IN')}
      </td>

      <td className="p-4">
        <select
          value={paymentStatus}
          disabled={loading}
          onChange={(e) => handleStatusChange(orderStatus, e.target.value)}
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#141210] border focus:outline-none cursor-pointer ${
            paymentStatus === 'PAID'
              ? 'border-[#2A9D8F] text-[#2A9D8F]'
              : 'border-[#E69A28] text-[#E69A28]'
          }`}
        >
          {PAYMENT_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </td>

      <td className="p-4">
        <select
          value={orderStatus}
          disabled={loading}
          onChange={(e) => handleStatusChange(e.target.value, paymentStatus)}
          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded bg-[#141210] border border-[#29241F] focus:border-[#D4AF37] text-[#FDFBF7] focus:outline-none cursor-pointer"
        >
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
