import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendCustomerOrderEmail, sendAdminOrderNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify Webhook HMAC signature if webhook secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[WEBHOOK ERROR] Invalid Razorpay webhook signature header');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log(`[RAZORPAY WEBHOOK] Processing event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId },
          include: { items: true },
        });

        if (order && order.paymentStatus !== 'PAID') {
          // Update Order Status to PAID
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              orderStatus: 'PROCESSING',
              razorpayPaymentId,
            },
            include: { items: true },
          });

          // Decrement product inventory stock
          for (const item of order.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }

          // Trigger email receipts
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
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Error handling Razorpay webhook:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
