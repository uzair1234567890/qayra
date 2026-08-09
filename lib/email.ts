import nodemailer from 'nodemailer';

interface OrderEmailProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export async function sendCustomerOrderEmail(props: OrderEmailProps) {
  const { orderNumber, customerName, customerEmail, shippingAddress, city, state, pincode, totalAmount, items } = props;

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
            <div class="order-badge">Order #${orderNumber}</div>
          </div>

          <p style="color: #D6D0C7; font-size: 15px;">Dear ${customerName},</p>
          <p style="color: #A0988E; font-size: 14px; line-height: 1.6;">
            We have confirmed your purchase for Qayra luxury car perfumes. Our scent artisans are preparing your package for express dispatch.
          </p>

          <div class="section-title">Order Items</div>
          <table>
            ${itemsHtml}
            <tr class="total-row">
              <td>Total Amount Paid</td>
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
            For inquiries, contact support@qayra.com
          </div>
        </div>
      </body>
    </html>
  `;

  // Log in dev environment or send real email if SMTP is configured
  console.log(`[EMAIL DISPATCH] Sent order confirmation for #${orderNumber} to ${customerEmail}`);

  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Qayra Perfumes" <orders@qayra.com>',
        to: customerEmail,
        subject: `Order Confirmation #${orderNumber} - Qayra Luxury Car Fragrance`,
        html,
      });
    } catch (err) {
      console.error('[EMAIL ERROR] Failed to dispatch Nodemailer email:', err);
    }
  }
}

export async function sendAdminOrderNotification(props: OrderEmailProps) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@qayra.com';
  console.log(`[ADMIN ALERT] New order #${props.orderNumber} placed by ${props.customerName} (₹${props.totalAmount}) -> ${adminEmail}`);
}
