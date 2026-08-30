import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, email, phone } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    let discountPct = 0;
    if (normalizedCode === 'ROYAL15') {
      discountPct = 0.10; // 10% Discount
    } else if (normalizedCode === 'EXECUTIVE20') {
      discountPct = 0.20; // 20% Discount
    } else {
      return NextResponse.json(
        { valid: false, error: 'Invalid coupon code. Try ROYAL15 for 10% OFF.' },
        { status: 400 }
      );
    }

    // Check if user is logged in
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('user_token')?.value;
      if (token) {
        const decoded = jwt.verify(
          token,
          process.env.ADMIN_JWT_SECRET || 'qayra_super_secret_jwt_key_2026'
        ) as { userId: string };
        userId = decoded.userId;
      }
    } catch {
      // Ignore token decode error
    }

    // Check database to see if this customer has already used this coupon code
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? phone.trim().replace(/\s+/g, '') : null;

    const whereConditions: any[] = [];
    if (normalizedEmail) {
      whereConditions.push({ customerEmail: { equals: normalizedEmail, mode: 'insensitive' } });
    }
    if (normalizedPhone && normalizedPhone.length >= 10) {
      whereConditions.push({ customerPhone: { contains: normalizedPhone.slice(-10) } });
    }
    if (userId) {
      whereConditions.push({ userId });
    }

    if (whereConditions.length > 0) {
      try {
        const existingOrder = await prisma.order.findFirst({
          where: {
            couponCode: normalizedCode,
            paymentStatus: { not: 'FAILED' },
            orderStatus: { not: 'CANCELLED' },
            OR: whereConditions,
          },
        });

        if (existingOrder) {
          return NextResponse.json(
            {
              valid: false,
              error: `Coupon ${normalizedCode} has already been used once for this email/mobile number. Each coupon can only be used once per customer.`,
            },
            { status: 400 }
          );
        }
      } catch (dbErr) {
        console.warn('[COUPON CHECK DB WARNING]', dbErr);
      }
    }

    return NextResponse.json({
      valid: true,
      code: normalizedCode,
      discountPct,
      description: normalizedCode === 'ROYAL15' ? '10% OFF Special Discount' : '20% OFF Executive Discount',
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate coupon' }, { status: 500 });
  }
}
