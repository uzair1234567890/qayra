import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customerName, customerEmail, customerPhone, shippingAddress, city, state, pincode } = body;

    if (!items || !items.length || !customerName || !customerEmail || !shippingAddress || !pincode) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    // Validate cart products and re-calculate actual total price against DB prices
    let totalAmount = 0;
    const verifiedOrderItems: Array<{
      productId: string;
      productName: string;
      productImage: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: item.id },
      });

      if (!dbProduct || !dbProduct.isActive) {
        return NextResponse.json(
          { error: `Product "${item.name || item.id}" is currently unavailable.` },
          { status: 400 }
        );
      }

      if (dbProduct.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${dbProduct.name}". Only ${dbProduct.stock} left.` },
          { status: 400 }
        );
      }

      let parsedImages = [];
      try {
        parsedImages = JSON.parse(dbProduct.images);
      } catch (e) {
        parsedImages = [dbProduct.images];
      }

      const itemTotal = dbProduct.price * item.quantity;
      totalAmount += itemTotal;

      verifiedOrderItems.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        productImage: parsedImages[0] || '/images/products/oud_nocturne.jpg',
        price: dbProduct.price,
        quantity: item.quantity,
      });
    }

    // Free shipping threshold ₹1499, otherwise add ₹99 shipping
    const shippingFee = totalAmount >= 1499 ? 0 : 99;
    const finalTotalAmount = totalAmount + shippingFee;

    // Generate unique order number (e.g. QYR-839201)
    const orderNumber = `QYR-${Math.floor(100000 + Math.random() * 900000)}`;

    let razorpayOrderId = `order_mock_${orderNumber}_${Date.now()}`;

    // Initialize Razorpay SDK if valid key is available
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && !keyId.includes('MockKey')) {
      try {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const rzpOrder = await razorpay.orders.create({
          amount: Math.round(finalTotalAmount * 100), // Amount in paise
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            customerName,
            customerEmail,
          },
        });

        razorpayOrderId = rzpOrder.id;
      } catch (err) {
        console.warn('[RAZORPAY WARNING] Live Razorpay initialization skipped, using fallback order token:', err);
      }
    }

    // Save order in database with PENDING status
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        shippingAddress,
        city: city || 'City',
        state: state || 'State',
        pincode,
        totalAmount: finalTotalAmount,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        razorpayOrderId,
        items: {
          create: verifiedOrderItems,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: newOrder,
      razorpayOrderId,
      amountPaise: Math.round(finalTotalAmount * 100),
      currency: 'INR',
      razorpayKeyId: keyId || 'rzp_test_QayraMockKey123',
    });
  } catch (error) {
    console.error('Error creating checkout order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
