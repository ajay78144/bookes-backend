const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Check if SMTP environment variables are set
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } catch (err) {
        console.warn('⚠️ SMTP Transporter init notice:', err.message);
      }
    }
  }

  /**
   * Sends order confirmation, invoice, and digital e-book licenses.
   */
  async sendOrderInvoice({ customerEmail, customerName, order, licenses = [] }) {
    if (!customerEmail) return { success: false, reason: 'No recipient email' };

    const itemsHtml = (order.items || [])
      .map(
        it => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; font-weight: 600;">${it.title || 'E-Book'}</td>
          <td style="padding: 10px; text-align: center;">${it.qty || it.quantity || 1}</td>
          <td style="padding: 10px; text-align: right;">${order.currency || 'INR'} ${(it.price || it.priceUSD || 0)}</td>
        </tr>`
      )
      .join('');

    const licensesHtml = licenses
      .map(
        lic => `
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
          <strong style="color: #0f172a;">${lic.title || 'Digital License'}:</strong><br>
          <code style="display: inline-block; margin-top: 4px; font-size: 13px; color: #166534; font-family: monospace; background: #dcfce7; padding: 4px 8px; border-radius: 4px;">
            KEY: ${lic.licenseKey || 'AUTO-UNLOCKED-IN-ACCOUNT'}
          </code>
        </div>`
      )
      .join('');

    const emailContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #cd7c5e; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #2b2b2b; margin: 0;">Book<span style="color: #cd7c5e;">Saw</span> E-Books</h2>
          <p style="color: #64748b; margin: 4px 0 0;">Thank you for your purchase!</p>
        </div>

        <p>Hi <strong>${customerName || 'Reader'}</strong>,</p>
        <p>Your payment via Razorpay has been verified and your digital e-book access is unlocked!</p>

        <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderNumber || order.orderId || order.id}</p>
          <p style="margin: 4px 0;"><strong>Razorpay Payment ID:</strong> ${order.razorpay_payment_id || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Total Paid:</strong> ${order.currency || 'INR'} ${order.convertedTotal || order.amount || order.totalUSD}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">PAID &amp; COMPLETED</span></p>
        </div>

        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${licenses.length > 0 ? `<h3>Your Digital Licenses</h3>${licensesHtml}` : ''}

        <div style="margin-top: 24px; text-align: center;">
          <a href="http://localhost:5000/account.html" style="background: #cd7c5e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">
            Access Your Reader Library
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          BookSaw Digital Store &copy; 2026. All rights reserved.
        </p>
      </div>
    `;

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"BookSaw Store" <${process.env.SMTP_FROM || 'no-reply@booksaw.com'}>`,
          to: customerEmail,
          subject: `Your BookSaw Order Confirmation & E-Book Access [${order.orderNumber || order.id}]`,
          html: emailContent
        });
        console.log(`✉️ Email dispatched to ${customerEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.warn(`Email delivery failed to ${customerEmail}:`, err.message);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`[Invoice Simulation] Email ready for ${customerEmail} (Order #${order.orderNumber || order.id})`);
      return { success: true, simulated: true };
    }
  }
}

module.exports = new EmailService();
