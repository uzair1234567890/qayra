import { NextResponse } from 'next/server';
import { sendAdminOrderNotification } from '@/lib/email';

export async function GET() {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'umaird68uu@gmail.com';
    const emailUser = process.env.EMAIL_SERVER_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
    const emailPass = process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!emailUser || !emailPass) {
      return NextResponse.json({
        success: false,
        error: 'Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables in Vercel.',
        configuredEmailUser: emailUser || 'Not Set',
        targetAdminEmail: adminEmail,
      }, { status: 400 });
    }

    await sendAdminOrderNotification({
      orderNumber: 'QYR-TEST-888',
      customerName: 'Test Customer',
      customerEmail: 'testcustomer@example.com',
      customerPhone: '+91 98229 29716',
      shippingAddress: 'Suite 101, Test Tower, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      totalAmount: 1499,
      paymentMethod: 'COD',
      items: [
        {
          productName: 'Qayra - Shadow Elixir',
          quantity: 1,
          price: 1499,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Test order notification email sent successfully to ${adminEmail}`,
      senderUser: emailUser,
    });
  } catch (err: any) {
    console.error('Test email dispatch failed:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to send test email',
    }, { status: 500 });
  }
}
