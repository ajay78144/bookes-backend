const razorpayService = require('../services/razorpayService');
const emailService = require('../services/emailService');
const db = require('../db/jsonDb');
const { getActiveRazorpaySettings } = require('../config/razorpay');

function generateLicenseKey() {
  const s1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const s2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const s3 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BSK-${s1}-${s2}-${s3}`;
}

/**
 * POST /api/payment/create-order
 * Creates an official Razorpay Order for checkout.
 */
const createOrder = async (req, res, next) => {
  try {
    const { amount, currency, customer = {}, items = [] } = req.body;

    const customerName = (customer.name || req.body.customerName || (req.user ? req.user.name : '') || 'Valued Reader').trim();
    const customerEmail = (customer.email || req.body.customerEmail || (req.user ? req.user.email : '') || 'reader@example.com').toLowerCase().trim();
    const customerPhone = (customer.phone || req.body.customerPhone || '').trim();

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid order amount greater than 0 is required.'
      });
    }

    const targetCurrency = (currency || 'INR').toUpperCase();
    const receipt = `order_rcpt_${Date.now()}`;
    const notes = {
      customerName,
      customerEmail,
      itemCount: String(items.length)
    };

    // Create Order with Razorpay SDK
    const rzpOrder = await razorpayService.createOrder({
      amount: Number(amount),
      currency: targetCurrency,
      receipt,
      notes
    });

    // Save temporary order in DB with status pending_payment
    const orderCount = db.getCollection('orders').length + 1;
    const orderNumber = `BS-${String(orderCount).padStart(5, '0')}`;

    const savedOrder = db.insert('orders', {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      items: items.map(it => ({
        id: it.id,
        title: it.title || 'Digital E-Book',
        author: it.author || '',
        price: it.price || it.priceINR || it.priceUSD || 0,
        qty: it.qty || it.quantity || 1,
        image: it.image || ''
      })),
      amount: Number(amount),
      amountInPaise: rzpOrder.amount,
      currency: rzpOrder.currency,
      status: 'pending_payment',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      razorpay_order_id: rzpOrder.id,
      receipt: rzpOrder.receipt,
      userId: req.user ? req.user.id : null,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: rzpOrder.keyId,
      dbOrderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      isSandboxDemo: Boolean(rzpOrder.isSandboxDemo)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payment/verify
 * Performs mandatory cryptographic HMAC-SHA256 signature verification.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Missing required verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature).'
      });
    }

    // Verify HMAC-SHA256 signature
    const verification = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!verification.isValid) {
      console.warn(`[Security Alert] Payment signature mismatch for Razorpay order ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: 'Security Warning: Payment verification failed. Signature mismatch detected.'
      });
    }

    // Retrieve order from database
    let order = db.getOrderByRazorpayOrderId(razorpay_order_id);
    if (!order && orderId) {
      order = db.findById('orders', orderId);
    }

    // If order was not yet recorded in DB, create one
    if (!order) {
      const orderCount = db.getCollection('orders').length + 1;
      order = db.insert('orders', {
        orderNumber: `BS-${String(orderCount).padStart(5, '0')}`,
        customerName: req.user ? req.user.name : 'Verified Customer',
        customerEmail: req.user ? req.user.email : 'reader@example.com',
        amount: 0,
        currency: 'INR',
        razorpay_order_id,
        status: 'pending_payment',
        createdAt: new Date().toISOString()
      });
    }

    // Generate digital book licenses
    const licenses = [];
    const unlockedBookIds = [];

    (order.items || []).forEach(item => {
      const licKey = generateLicenseKey();
      licenses.push({
        bookId: item.id,
        title: item.title,
        licenseKey: licKey,
        unlockedAt: new Date().toISOString()
      });
      unlockedBookIds.push(item.id);
    });

    // Update order status to paid and completed
    const updatedOrder = db.update('orders', order.id, {
      status: 'paid',
      paymentStatus: 'paid',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      licenses,
      completedAt: new Date().toISOString()
    });

    // Automatically unlock digital books for user account
    let targetUserId = order.userId || (req.user ? req.user.id : null);
    if (!targetUserId && order.customerEmail) {
      const existingUser = db.findUserByEmail(order.customerEmail);
      if (existingUser) targetUserId = existingUser.id;
    }

    if (targetUserId) {
      db.unlockBooksForUser(targetUserId, licenses);
    }

    // Send invoice and download link via Nodemailer (non-blocking)
    emailService
      .sendOrderInvoice({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        order: updatedOrder,
        licenses
      })
      .catch(e => console.warn('Email dispatch warning:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully. E-Book licenses unlocked!',
      order: updatedOrder,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      paymentId: razorpay_payment_id,
      unlockedBookIds,
      licenses
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payment/webhook
 * Handles Razorpay Webhook events: payment.captured, payment.failed, refund.processed.
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body.toString();

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('⚠️ Invalid Razorpay webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const order = db.getOrderByRazorpayOrderId(payment.order_id);
      if (order && order.status !== 'paid') {
        db.update('orders', order.id, {
          status: 'paid',
          paymentStatus: 'paid',
          razorpay_payment_id: payment.id,
          completedAt: new Date().toISOString()
        });
      }
    } else if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      const order = db.getOrderByRazorpayOrderId(payment.order_id);
      if (order) {
        db.update('orders', order.id, {
          status: 'failed',
          paymentStatus: 'failed',
          failureReason: payment.error_description
        });
      }
    } else if (event === 'refund.processed') {
      const refund = payload.payload.refund.entity;
      const order = db.getOrderByRazorpayPaymentId(refund.payment_id);
      if (order) {
        db.update('orders', order.id, {
          status: 'refunded',
          paymentStatus: 'refunded',
          refundDetails: {
            refundId: refund.id,
            amount: refund.amount / 100,
            refundedAt: new Date().toISOString()
          }
        });
      }
    }

    return res.status(200).json({ status: 'ok', received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ success: false, message: 'Webhook error' });
  }
};

/**
 * POST /api/payment/create-intent
 * Compatibility endpoint for storefront checkout
 */
const createIntent = async (req, res, next) => {
  try {
    const { items = [], totalUSD, totalINR, currency = 'INR', customerEmail } = req.body;
    const finalAmount = totalINR || (totalUSD ? totalUSD * 83.5 : 999);

    const rzpOrder = await razorpayService.createOrder({
      amount: finalAmount,
      currency,
      receipt: `intent_${Date.now()}`,
      notes: { customerEmail: customerEmail || '' }
    });

    const orderCount = db.getCollection('orders').length + 1;
    const orderNumber = `BS-${String(orderCount).padStart(5, '0')}`;

    const savedOrder = db.insert('orders', {
      orderNumber,
      customerEmail: customerEmail || 'customer@example.com',
      customerName: req.user ? req.user.name : 'Customer',
      items,
      amount: finalAmount,
      currency,
      razorpay_order_id: rzpOrder.id,
      status: 'pending_payment',
      paymentMethod: 'razorpay',
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: rzpOrder.keyId,
      dbOrderId: savedOrder.id
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  createIntent
};
