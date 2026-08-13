import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signAdminToken } from '@/lib/auth';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'qayra_super_secret_jwt_key_2026';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email or username and password are required' },
        { status: 400 }
      );
    }

    const input = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input },
          { email: `${input}@qayra.com` },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const isUmair = user.email.toLowerCase() === 'umairuzair' || user.email.toLowerCase() === 'umairuzair@qayra.com';

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        shippingAddress: user.shippingAddress,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        isAdmin: isUmair,
      },
    });

    response.cookies.set({
      name: 'user_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    if (isUmair) {
      const adminToken = await signAdminToken({
        id: user.id,
        email: user.email,
        role: 'ADMIN',
      });
      response.cookies.set({
        name: 'qayra_admin_token',
        value: adminToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate' },
      { status: 500 }
    );
  }
}
