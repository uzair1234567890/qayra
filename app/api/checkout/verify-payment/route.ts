import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendCustomerOrderEmail, sendAdminOrderNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMockPayment } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify signature if using real Razorpay credentials
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!isMockPayment && secret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    // Update Order to PAID status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        orderStatus: 'PROCESSING',
        razorpayPaymentId: razorpayPaymentId || `pay_mock_${Date.now()}`,
      },
      include: { items: true },
    });

    // Auto-decrement inventory stock for each product in order
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Dispatch confirmation email
    await sendCustomerOrderEmail({
      orderNumber: updatedOrder.orderNumber,
      customerName: updatedOrder.customerName,
      customerEmail: updatedOrder.customerEmail,
      shippingAddress: updatedOrder.shippingAddress,
      city: updatedOrder.city,
      state: updatedOrder.state,
      pincode: updatedOrder.pincode,
      totalAmount: updatedOrder.totalAmount,
      items: updatedOrder.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    await sendAdminOrderNotification({
      orderNumber: updatedOrder.orderNumber,
      customerName: updatedOrder.customerName,
      customerEmail: updatedOrder.customerEmail,
      shippingAddress: updatedOrder.shippingAddress,
      city: updatedOrder.city,
      state: updatedOrder.state,
      pincode: updatedOrder.pincode,
      totalAmount: updatedOrder.totalAmount,
      items: updatedOrder.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
