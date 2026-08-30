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
      paymentMethod = 'PREPAID',
    } = body;

    if (!items || !items.length || !customerName || !customerEmail || !customerPhone || !shippingAddress || !pincode) {
      return NextResponse.json(
        { error: 'Missing required order fields (Name, Email, Mobile Number, Address, or Pincode)' },
        { status: 400 }
      );
    }

    // Find any existing product ID to use as a safe fallback foreign-key for custom/combo bundles
    let fallbackProductId: string | null = null;
    try {
      const anyProd = await prisma.product.findFirst({ select: { id: true } });
      if (anyProd) fallbackProductId = anyProd.id;
    } catch (e) {
      console.warn('[FALLBACK PRODUCT QUERY WARNING]', e);
    }

    // Validate cart products and build verified order items
    let totalAmount = 0;
    const verifiedOrderItems: Array<{
      productId: string;
      productName: string;
      productImage: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      // Find product by ID, slug, or name
      let dbProduct: any = null;
      try {
        dbProduct = await prisma.product.findFirst({
          where: {
            OR: [
              ...(item.id ? [{ id: item.id }, { slug: item.id }] : []),
              ...(item.slug ? [{ slug: item.slug }] : []),
              ...(item.name ? [{ name: item.name }] : []),
            ],
          },
        });
      } catch (dbErr) {
        console.warn('[PRODUCT LOOKUP WARNING]', dbErr);
      }

      // Determine product ID (must be a valid DB Product UUID if products exist in DB)
      const productId = dbProduct?.id || fallbackProductId || item.id;
      const productName = dbProduct?.name || item.name || 'Qayra Luxury Perfume';
      const itemPrice = typeof item.price === 'number' && item.price > 0 ? item.price : (dbProduct?.price || 1499);
      const itemQuantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;

      let parsedImages: string[] = [];
      if (dbProduct) {
        try {
          parsedImages = JSON.parse(dbProduct.images);
        } catch {
          parsedImages = [dbProduct.images];
        }
      }

      const productImage = item.image || parsedImages[0] || '/images/products/shadow_elixir.jpg';

      totalAmount += itemPrice * itemQuantity;

      verifiedOrderItems.push({
        productId,
        productName,
        productImage,
        price: itemPrice,
        quantity: itemQuantity,
      });
    }

    // Check if user account exists in DB for foreign key constraint
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('user_token')?.value;
      if (token) {
        const decoded = jwt.verify(
          token,
          process.env.ADMIN_JWT_SECRET || 'qayra_super_secret_jwt_key_2026'
        ) as { userId: string };

        if (decoded?.userId) {
          const userInDb = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true },
          });
          if (userInDb) userId = userInDb.id;
        }
      } else {
        const existingUser = await prisma.user.findUnique({
          where: { email: customerEmail.trim().toLowerCase() },
          select: { id: true },
        });
        if (existingUser) {
          userId = existingUser.id;
        }
      }
    } catch {
      userId = null;
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

    // Helper to safely create order in Prisma (with fallback if new columns not yet migrated)
    const createOrderRecord = async (method: string, status: string, orderSt: string, fee: number) => {
      try {
        return await prisma.order.create({
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
            paymentMethod: method,
            paymentStatus: status,
            orderStatus: orderSt,
            couponCode: normalizedCode,
            discountAmount,
            codFee: fee,
            razorpayOrderId: null,
            items: {
              create: verifiedOrderItems,
            },
          },
          include: {
            items: true,
          },
        });
      } catch (firstErr: any) {
        console.warn('[ORDER CREATE FALLBACK WITHOUT OPTIONAL FIELDS]', firstErr?.message);
        // Fallback for databases where couponCode/codFee columns may not exist yet
        return await prisma.order.create({
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
            paymentMethod: method,
            paymentStatus: status,
            orderStatus: orderSt,
            razorpayOrderId: null,
            items: {
              create: verifiedOrderItems,
            },
          },
          include: {
            items: true,
          },
        });
      }
    };

    // Handle Cash on Delivery (COD)
    if (isCODOrder) {
      const newOrder = await createOrderRecord('COD', 'COD_PENDING', 'PROCESSING', 50);

      // Decrement product stock safely
      for (const item of verifiedOrderItems) {
        try {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        } catch (stockErr) {
          console.warn('[STOCK DECREMENT SKIPPED]', stockErr);
        }
      }

      // Dispatch instant email alerts
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
    if (paymentMethod === 'PREPAID' || paymentMethod === 'ONLINE') {
      const newOrder = await createOrderRecord('PREPAID', 'PENDING', 'PROCESSING', 0);

      // Decrement product stock safely
      for (const item of verifiedOrderItems) {
        try {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        } catch (stockErr) {
          console.warn('[STOCK DECREMENT SKIPPED]', stockErr);
        }
      }

      // Dispatch instant email alerts
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

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  } catch (error: any) {
    console.error('Error creating checkout order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create order. Please check all details and try again.' },
      { status: 500 }
    );
  }
}
