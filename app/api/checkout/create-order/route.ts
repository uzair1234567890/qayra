import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
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

    // Find any existing product in DB to use its ID as safe foreign-key for custom combo bundles
    let fallbackProductId: string | null = null;
    try {
      const anyProd = await prisma.product.findFirst({ select: { id: true } });
      if (anyProd) fallbackProductId = anyProd.id;
    } catch {
      // Ignore
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
      } catch {
        // Ignore lookup error
      }

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

    // Verify user account exists in DB for foreign-key safety
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
            razorpayOrderId: { contains: normalizedCode },
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

    // Store coupon in razorpayOrderId field for reliable single-use tracking without DB schema dependencies
    const orderTrackingMeta = normalizedCode
      ? `COUPON:${normalizedCode}`
      : isCODOrder
      ? 'COD'
      : 'PREPAID';

    // Create Order in Database
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
        paymentMethod: isCODOrder ? 'COD' : 'PREPAID',
        paymentStatus: isCODOrder ? 'COD_PENDING' : 'PENDING',
        orderStatus: 'PROCESSING',
        razorpayOrderId: orderTrackingMeta,
        items: {
          create: verifiedOrderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Safely decrement product stock
    for (const item of verifiedOrderItems) {
      try {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      } catch {
        // Safe to continue even if custom bundle ID
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
      paymentMethod: isCODOrder ? 'COD' : 'PREPAID',
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
      console.error('[EMAIL DISPATCH ERROR]', e);
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      isCOD: isCODOrder,
      isPrepaid: !isCODOrder,
    });
  } catch (error: any) {
    console.error('Error creating checkout order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create order. Please check all details and try again.' },
      { status: 500 }
    );
  }
}
