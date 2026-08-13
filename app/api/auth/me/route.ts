import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { verifyAdminToken } from '@/lib/auth';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'qayra_super_secret_jwt_key_2026';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('user_token')?.value;
    const adminToken = cookieStore.get('qayra_admin_token')?.value;

    let user = null;
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            shippingAddress: true,
            city: true,
            state: true,
            pincode: true,
            createdAt: true,
          },
        });

        if (dbUser) {
          user = dbUser;
          const lower = dbUser.email.toLowerCase();
          if (lower === 'umairuzair' || lower === 'umairuzair@qayra.com') {
            isAdmin = true;
          }
        }
      } catch (err) {}
    }

    if (adminToken) {
      const verifiedAdmin = await verifyAdminToken(adminToken);
      if (verifiedAdmin) {
        isAdmin = true;
      }
    }

    return NextResponse.json({ user, isAdmin });
  } catch (error) {
    return NextResponse.json({ user: null, isAdmin: false });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('user_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const body = await request.json();
    const { name, phone, shippingAddress, city, state, pincode } = body;

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(shippingAddress !== undefined && { shippingAddress: shippingAddress ? shippingAddress.trim() : null }),
        ...(city !== undefined && { city: city ? city.trim() : null }),
        ...(state !== undefined && { state: state ? state.trim() : null }),
        ...(pincode !== undefined && { pincode: pincode ? pincode.trim() : null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        shippingAddress: true,
        city: true,
        state: true,
        pincode: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
