const db = require('../db/jsonDb');
const { getRazorpayConfig, updateRazorpayConfig } = require('../config/razorpay');
const razorpayService = require('../services/razorpayService');
const emailService = require('../services/emailService');

/**
 * GET /api/admin/stats
 * Overview metrics cards & live Razorpay status
 */
const getStats = async (req, res, next) => {
  try {
    const orders = db.getCollection('orders');
    const users = db.getCollection('users');
    const books = db.getCollection('books');
    const rzpConfig = getRazorpayConfig();

    const paidOrders = orders.filter(o => o.status === 'paid' || o.paymentStatus === 'paid');
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'pending_payment');
    const refundedOrders = orders.filter(o => o.status === 'refunded' || o.status === 'partially_refunded');

    const totalRevenue = paidOrders.reduce((sum, o) => {
      const amt = Number(o.amount || o.convertedTotal || o.totalUSD || 0);
      return sum + amt;
    }, 0);

    const razorpayPaidOrders = paidOrders.filter(o => o.paymentMethod === 'razorpay' || o.razorpay_payment_id);
    const razorpayCollected = razorpayPaidOrders.reduce((sum, o) => {
      const amt = Number(o.amount || o.convertedTotal || o.totalUSD || 0);
      return sum + amt;
    }, 0);

    const totalOrdersCount = orders.length;
    const successRate = totalOrdersCount > 0 ? Math.round((paidOrders.length / totalOrdersCount) * 100) : 100;
    const registeredReaders = users.filter(u => u.role !== 'admin').length;

    // Recent 10 transactions
    const recentTransactions = [...orders]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);

    const connectionBadge = rzpConfig.enabled
      ? (rzpConfig.mode === 'live' ? '🟢 Live Mode Active' : '🟡 Test Mode Sandbox')
      : '🔴 Gateway Disabled';

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        razorpayCollected: Math.round(razorpayCollected * 100) / 100,
        totalOrders: totalOrdersCount,
        paidOrdersCount: paidOrders.length,
        pendingOrdersCount: pendingOrders.length,
        refundedOrdersCount: refundedOrders.length,
        registeredReaders,
        activeBooks: books.length,
        successRate,
        currency: rzpConfig.currency || 'INR',
        razorpayStatusBadge: connectionBadge,
        razorpay: {
          enabled: rzpConfig.enabled,
          mode: rzpConfig.mode,
          keyId: rzpConfig.keyId
        }
      },
      recentTransactions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/orders
 * Paginated orders list with search, filter, and payment details
 */
const getOrders = async (req, res, next) => {
  try {
    let orders = db.getCollection('orders');
    const { status, search, page = 1, limit = 25 } = req.query;

    // Filter by status
    if (status && status !== 'all') {
      const filterStatus = status.toLowerCase();
      orders = orders.filter(o => {
        if (filterStatus === 'paid') return o.status === 'paid' || o.paymentStatus === 'paid';
        if (filterStatus === 'pending') return o.status === 'pending' || o.status === 'pending_payment';
        if (filterStatus === 'refunded') return o.status === 'refunded' || o.status === 'partially_refunded';
        if (filterStatus === 'cancelled') return o.status === 'cancelled' || o.status === 'failed';
        return (o.status && o.status.toLowerCase() === filterStatus) || (o.paymentStatus && o.paymentStatus.toLowerCase() === filterStatus);
      });
    }

    // Filter by search query
    if (search) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o =>
        String(o.id).toLowerCase().includes(q) ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.razorpay_order_id && o.razorpay_order_id.toLowerCase().includes(q)) ||
        (o.razorpay_payment_id && o.razorpay_payment_id.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = orders.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedOrders = orders.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      orders: paginatedOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/settings/razorpay
 * View current Razorpay settings with masked secret
 */
const getRazorpaySettings = async (req, res, next) => {
  try {
    const config = getRazorpayConfig();
    return res.status(200).json({
      success: true,
      settings: config
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/settings/razorpay
 * Updates Razorpay credentials, mode, and parameters
 */
const updateRazorpaySettings = async (req, res, next) => {
  try {
    const {
      enabled,
      mode,
      keyId,
      keySecret,
      webhookSecret,
      currency,
      storeName
    } = req.body;

    const updated = updateRazorpayConfig({
      enabled,
      mode,
      keyId,
      keySecret,
      webhookSecret,
      currency,
      storeName
    });

    return res.status(200).json({
      success: true,
      message: 'Razorpay configuration saved successfully!',
      settings: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/settings/razorpay/test-connection
 * Live authentication check with Razorpay API
 */
const testConnection = async (req, res, next) => {
  try {
    const result = await razorpayService.testConnection();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error checking Razorpay connection'
    });
  }
};

/**
 * POST /api/admin/orders/:id/refund
 * Initiates partial/full refund via Razorpay Refund API
 */
const processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason = 'Customer refund request' } = req.body;

    const order = db.findById('orders', id);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${id} not found.` });
    }

    if (order.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'This order has already been fully refunded.' });
    }

    const paymentId = order.razorpay_payment_id;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'No Razorpay payment ID found on this order. Only Razorpay-paid orders can be refunded via API.'
      });
    }

    const orderAmount = Number(order.amount || order.convertedTotal || order.totalUSD || 0);
    const refundAmount = amount ? Number(amount) : orderAmount;

    // Call Razorpay Refund Service
    const refundResult = await razorpayService.processRefund(paymentId, {
      amount: refundAmount,
      notes: { orderNumber: order.orderNumber, reason }
    });

    const isPartial = refundAmount < orderAmount;
    const updatedOrder = db.update('orders', id, {
      status: isPartial ? 'partially_refunded' : 'refunded',
      paymentStatus: isPartial ? 'partially_refunded' : 'refunded',
      refundDetails: {
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        reason,
        refundedAt: new Date().toISOString()
      }
    });

    return res.status(200).json({
      success: true,
      message: `Refund of ${order.currency || 'INR'} ${refundResult.amount} processed successfully!`,
      order: updatedOrder,
      refund: refundResult
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/orders/:id/resend-access
 * Resends e-book access email & invoice to customer
 */
const resendAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = db.findById('orders', id);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${id} not found.` });
    }

    const result = await emailService.sendOrderInvoice({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      order,
      licenses: order.licenses || []
    });

    return res.status(200).json({
      success: true,
      message: `Access email dispatched to ${order.customerEmail}`,
      result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 * Registered readers and admin list
 */
const getUsers = async (req, res, next) => {
  try {
    const users = db.getCollection('users').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      country: u.country,
      currency: u.currency,
      phone: u.phone || '',
      libraryCount: (u.library || []).length,
      createdAt: u.createdAt
    }));

    return res.status(200).json({
      success: true,
      users
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getOrders,
  getRazorpaySettings,
  updateRazorpaySettings,
  testConnection,
  processRefund,
  resendAccess,
  getUsers
};
