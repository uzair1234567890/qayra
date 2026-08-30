import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/db';
import { sendCustomerOrderEmail, sendAdminOrderNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      state,
      pincode,
      couponCode,
      paymentMethod = 'COD', // COD only
    } = body;

    if (!items || !items.length || !customerName || !customerEmail || !customerPhone || !shippingAddress || !pincode) {
      return NextResponse.json(
        { error: 'Missing required order fields (Name, Email, Mobile Number, Address, or Pincode)' },
        { status: 400 }
      );
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

      const itemPrice = dbProduct.price;
      totalAmount += itemPrice * item.quantity;

      verifiedOrderItems.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        productImage: parsedImages[0] || '/images/products/shadow_elixir.jpg',
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    // Check if user account exists for this email or token
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('user_token')?.value;
      if (token) {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'qayra_super_secret_jwt_key_2026') as { userId: string };
        userId = decoded.userId;
      } else {
        const existingUser = await prisma.user.findUnique({
          where: { email: customerEmail.trim().toLowerCase() },
        });
        if (existingUser) {
          userId = existingUser.id;
        }
      }
    } catch (e) {
      // Ignore token parse errors
    }

    // Coupon discount logic & Single-use validation
    let discountPct = 0;
    let normalizedCode: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      normalizedCode = couponCode.trim().toUpperCase();
      if (normalizedCode === 'ROYAL15') discountPct = 0.10; // 10% Discount
      else if (normalizedCode === 'EXECUTIVE20') discountPct = 0.20; // 20% Discount
      else {
        return NextResponse.json(
          { error: 'Invalid coupon code. Try ROYAL15 for 10% OFF.' },
          { status: 400 }
        );
      }

      // Check single-use restriction in database
      const normalizedEmail = customerEmail.trim().toLowerCase();
      const normalizedPhone = customerPhone ? customerPhone.trim().replace(/\s+/g, '') : '';
      const whereConditions: any[] = [{ customerEmail: { equals: normalizedEmail, mode: 'insensitive' } }];

      if (normalizedPhone.length >= 10) {
        whereConditions.push({ customerPhone: { contains: normalizedPhone.slice(-10) } });
      }
      if (userId) {
        whereConditions.push({ userId });
      }

      try {
        const priorOrderWithCoupon = await prisma.order.findFirst({
          where: {
            couponCode: normalizedCode,
            paymentStatus: { not: 'FAILED' },
            orderStatus: { not: 'CANCELLED' },
            OR: whereConditions,
          },
        });

        if (priorOrderWithCoupon) {
          return NextResponse.json(
            {
              error: `Coupon ${normalizedCode} has already been redeemed once for this account/email/phone. Each coupon code is single-use only.`,
            },
            { status: 400 }
          );
        }
      } catch (dbErr) {
        console.warn('[COUPON REUSE CHECK WARNING]', dbErr);
      }
    }

    const discountAmount = Math.round(totalAmount * discountPct);
    const discountedSubtotal = Math.max(0, totalAmount - discountAmount);

    // Cash on Delivery has +₹50 handling charge; Prepaid is ₹0 free delivery
    const isCODOrder = paymentMethod === 'COD';
    const codFee = isCODOrder ? 50 : 0;
    const finalTotalAmount = discountedSubtotal + codFee;

    // Generate unique order number (e.g. QYR-839201)
    const orderNumber = `QYR-${Math.floor(100000 + Math.random() * 900000)}`;

    // Handle Cash on Delivery (COD)
    if (isCODOrder) {
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          customerName,
          customerEmail,
          customerPhone: customerPhone || '',
          shippingAddress,
          city: city || 'City',
          state: state || 'State',
          pincode,
          totalAmount: finalTotalAmount,
          paymentMethod: 'COD',
          paymentStatus: 'COD_PENDING',
          orderStatus: 'PROCESSING',
          couponCode: normalizedCode,
          discountAmount,
          codFee: 50,
          razorpayOrderId: null,
          items: {
            create: verifiedOrderItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement product stock immediately for COD order
      for (const item of verifiedOrderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Dispatch instant email alerts to customer and admin
      const emailPayload = {
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerPhone: newOrder.customerPhone,
        shippingAddress: newOrder.shippingAddress,
        city: newOrder.city,
        state: newOrder.state,
        pincode: newOrder.pincode,
        totalAmount: newOrder.totalAmount,
        paymentMethod: 'COD',
        items: newOrder.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
      };

      try {
        await Promise.allSettled([
          sendCustomerOrderEmail(emailPayload),
          sendAdminOrderNotification(emailPayload),
        ]);
      } catch (e) {
        console.error('[COD EMAIL DISPATCH ERROR]', e);
      }

      return NextResponse.json({
        success: true,
        order: newOrder,
        isCOD: true,
      });
    }

    // Handle Prepaid (WhatsApp Payment Collection / UPI)
    if (paymentMethod === 'PREPAID') {
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          customerName,
          customerEmail,
          customerPhone: customerPhone || '',
          shippingAddress,
          city: city || 'City',
          state: state || 'State',
          pincode,
          totalAmount: finalTotalAmount,
          paymentMethod: 'PREPAID',
          paymentStatus: 'PENDING',
          orderStatus: 'PROCESSING',
          couponCode: normalizedCode,
          discountAmount,
          codFee: 0,
          razorpayOrderId: null,
          items: {
            create: verifiedOrderItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement product stock immediately for Prepaid order
      for (const item of verifiedOrderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Dispatch instant email alerts to customer and admin
      const emailPayload = {
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerPhone: newOrder.customerPhone,
        shippingAddress: newOrder.shippingAddress,
        city: newOrder.city,
        state: newOrder.state,
        pincode: newOrder.pincode,
        totalAmount: newOrder.totalAmount,
        paymentMethod: 'PREPAID',
        items: newOrder.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
      };

      try {
        await Promise.allSettled([
          sendCustomerOrderEmail(emailPayload),
          sendAdminOrderNotification(emailPayload),
        ]);
      } catch (e) {
        console.error('[PREPAID EMAIL DISPATCH ERROR]', e);
      }

      return NextResponse.json({
        success: true,
        order: newOrder,
        isPrepaid: true,
      });
    }

    // Handle Online / Razorpay Payment (Fallback)
    let razorpayOrderId = `order_mock_${orderNumber}_${Date.now()}`;
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

    // Save order in database with PENDING status for Online payment
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        shippingAddress,
        city: city || 'City',
        state: state || 'State',
        pincode,
        totalAmount: finalTotalAmount,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        couponCode: normalizedCode,
        discountAmount,
        codFee: 0,
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
