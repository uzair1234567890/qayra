import nodemailer from 'nodemailer';

interface OrderEmailProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  totalAmount: number;
  paymentMethod?: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

function createTransporter(emailUser: string, emailPass: string) {
  const isGmail = emailUser.includes('@gmail.com') || !!process.env.GMAIL_USER;

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s+/g, ''), // strip any spaces from 16-char app password
      },
    });
  }

  const host = process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_SERVER_PORT || 587);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: emailUser,
      pass: emailPass.replace(/\s+/g, ''),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function getEmailCredentials() {
  const user = process.env.GMAIL_USER || process.env.EMAIL_SERVER_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASS;
  
  if (user && pass && !user.includes('example.com') && !pass.includes('password_here')) {
    return { emailUser: user, emailPass: pass };
  }
  return null;
}

export async function sendCustomerOrderEmail(props: OrderEmailProps) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    shippingAddress,
    city,
    state,
    pincode,
    totalAmount,
    items,
    paymentMethod = 'ONLINE',
  } = props;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #2C2723; color: #FDFBF7;">${item.productName} (x${item.quantity})</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #2C2723; color: #D4AF37; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0F0E0D; color: #FDFBF7; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #181614; border: 1px solid #2C2723; border-radius: 8px; padding: 32px; }
          .header { text-align: center; border-bottom: 1px solid #2C2723; padding-bottom: 24px; margin-bottom: 24px; }
          .logo { font-size: 28px; letter-spacing: 4px; color: #D4AF37; font-weight: bold; text-transform: uppercase; text-decoration: none; }
          .title { font-size: 20px; color: #FDFBF7; margin-top: 16px; font-weight: 300; }
          .order-badge { background: #25201B; border: 1px solid #C5A059; color: #D4AF37; font-size: 13px; padding: 6px 14px; border-radius: 20px; display: inline-block; margin-top: 8px; }
          .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: #C5A059; margin-top: 24px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .total-row td { padding-top: 16px; font-size: 18px; font-weight: bold; color: #D4AF37; }
          .address { line-height: 1.6; color: #A0988E; font-size: 14px; background: #1F1C19; padding: 14px; border-radius: 6px; border: 1px solid #2C2723; }
          .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #6E675E; border-top: 1px solid #2C2723; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">QAYRA</div>
            <div style="font-size: 11px; letter-spacing: 2px; color: #8A8175; text-transform: uppercase; margin-top: 4px;">Luxury Car Fragrance</div>
            <div class="title">Thank You For Your Order</div>
            <div class="order-badge">Order #${orderNumber} (${paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid'})</div>
          </div>

          <p style="color: #D6D0C7; font-size: 15px;">Dear ${customerName},</p>
          <p style="color: #A0988E; font-size: 14px; line-height: 1.6;">
            We have confirmed your purchase for Qayra luxury car perfumes. Our scent artisans are preparing your package for express dispatch.
          </p>

          ${
            paymentMethod === 'PREPAID'
              ? `
              <div style="background: #162B1A; border: 1px solid #25D366; color: #FDFBF7; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; line-height: 1.5;">
                <strong style="color: #25D366; display: block; margin-bottom: 4px;">📱 WhatsApp Payment Collection:</strong>
                Our team will reach out to you shortly on WhatsApp at <strong>${props.customerPhone || customerEmail}</strong> with the UPI payment QR code to collect payment of <strong>₹${totalAmount.toLocaleString('en-IN')}</strong>.
              </div>
              `
              : paymentMethod === 'COD'
              ? `
              <div style="background: #25201B; border: 1px solid #C5A059; color: #D4AF37; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; line-height: 1.5;">
                <strong>💵 Cash on Delivery:</strong> Please keep <strong>₹${totalAmount.toLocaleString('en-IN')}</strong> ready in cash upon arrival at your doorstep (includes ₹50 COD fee).
              </div>
              `
              : ''
          }

          <div class="section-title">Order Items</div>
          <table>
            ${itemsHtml}
            <tr class="total-row">
              <td>Total Amount Payable</td>
              <td style="text-align: right;">₹${totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div class="section-title">Shipping Address</div>
          <div class="address">
            <strong>${customerName}</strong><br>
            ${shippingAddress}<br>
            ${city}, ${state} - ${pincode}
          </div>

          <div class="footer">
            Qayra Luxury Car Perfumes &bull; Crafted for the Discerning Drive<br>
            For inquiries, contact support@qayra.in
          </div>
        </div>
      </body>
    </html>
  `;

  console.log(`[CUSTOMER EMAIL LOG] Order confirmation for #${orderNumber} sent to ${customerEmail}`);

  const creds = getEmailCredentials();

  if (creds) {
    try {
      const transporter = createTransporter(creds.emailUser, creds.emailPass);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Qayra Luxury Car Perfumes" <${creds.emailUser}>`,
        to: customerEmail,
        subject: `Order Confirmation #${orderNumber} - Qayra Luxury Car Fragrance`,
        html,
      });
      console.log(`[CUSTOMER EMAIL SUCCESS] Dispatched to ${customerEmail}`);
    } catch (err) {
      console.error('[CUSTOMER EMAIL ERROR]', err);
    }
  }
}

export async function sendAdminOrderNotification(props: OrderEmailProps) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'umaird68uu@gmail.com';
  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone = 'N/A',
    shippingAddress,
    city,
    state,
    pincode,
    totalAmount,
    paymentMethod = 'ONLINE',
    items,
  } = props;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #2C2723; color: #FDFBF7;">${item.productName} (x${item.quantity})</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #2C2723; color: #D4AF37; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #0F0E0D; color: #FDFBF7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #181614; border: 1px solid #D4AF37; border-radius: 10px; padding: 25px; }
          .header { text-align: center; border-bottom: 1px solid #2C2723; padding-bottom: 15px; margin-bottom: 20px; }
          .badge { background: #D4AF37; color: #0A0908; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
          .section { margin-top: 20px; background: #1F1C19; padding: 15px; border-radius: 8px; border: 1px solid #2C2723; }
          .label { color: #A0988E; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .val { color: #FDFBF7; font-size: 14px; font-weight: bold; margin-top: 4px; }
          .btn { display: inline-block; background: #D4AF37; color: #0A0908; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">🔥 NEW ORDER ALERT: #${orderNumber}</span>
            <h2 style="color: #D4AF37; margin-top: 15px; font-size: 22px;">New Qayra Order Received!</h2>
            <p style="color: #A0988E; font-size: 13px;">Payment Method: <strong>${paymentMethod === 'COD' ? '💵 Cash on Delivery (COD)' : '💳 Prepaid (Online)'}</strong></p>
          </div>

          <div class="section">
            <div class="label">Customer Information</div>
            <div class="val">${customerName}</div>
            <p style="margin: 4px 0 0 0; color: #D4AF37; font-size: 13px;">📱 Mobile: <strong>${customerPhone}</strong></p>
            <p style="margin: 4px 0 0 0; color: #A0988E; font-size: 13px;">✉️ Email: ${customerEmail}</p>
          </div>

          <div class="section">
            <div class="label">Shipping Address</div>
            <div class="val">${shippingAddress}</div>
            <p style="margin: 4px 0 0 0; color: #A0988E; font-size: 13px;">${city}, ${state} - ${pincode}</p>
          </div>

          <div class="section">
            <div class="label">Purchased Items</div>
            <table style="width: 100%; margin-top: 10px;">
              ${itemsHtml}
              <tr>
                <td style="padding-top: 12px; font-weight: bold; color: #FDFBF7;">Total Amount</td>
                <td style="padding-top: 12px; font-weight: bold; color: #D4AF37; text-align: right; font-size: 18px;">₹${totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center;">
            <a href="https://qayra.in/admin/orders" class="btn">Open Admin Dashboard</a>
          </div>
        </div>
      </body>
    </html>
  `;

  console.log(`[ADMIN NOTIFICATION LOG] Alert for Order #${orderNumber} sent to ${adminEmail} (Mobile: ${customerPhone})`);

  const creds = getEmailCredentials();

  if (creds) {
    try {
      const transporter = createTransporter(creds.emailUser, creds.emailPass);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Qayra Alert System" <${creds.emailUser}>`,
        to: adminEmail,
        subject: `🚨 NEW ORDER #${orderNumber} - ${customerName} (₹${totalAmount.toLocaleString('en-IN')})`,
        html,
      });
      console.log(`[ADMIN EMAIL DISPATCHED SUCCESS] Sent to ${adminEmail}`);
    } catch (err) {
      console.error('[ADMIN EMAIL ERROR] Could not dispatch SMTP email:', err);
    }
  } else {
    console.warn('[ADMIN EMAIL SKIPPED] Missing valid GMAIL_USER or GMAIL_APP_PASSWORD credentials');
  }
}
