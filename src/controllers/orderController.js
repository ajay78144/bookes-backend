const db = require('../db/jsonDb');

const getOrders = async (req, res, next) => {
  try {
    let orders = db.getCollection('orders');

    // If customer, only show their orders
    if (req.user && req.user.role !== 'admin') {
      const userEmail = (req.user.email || '').toLowerCase();
      orders = orders.filter(o => 
        (o.customerEmail && o.customerEmail.toLowerCase() === userEmail) ||
        (o.userId && String(o.userId) === String(req.user.id))
      );
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = db.findById('orders', id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found.`
      });
    }

    // If customer, ensure they own the order
    if (req.user && req.user.role !== 'admin') {
      const userEmail = (req.user.email || '').toLowerCase();
      const isOwner = (order.customerEmail && order.customerEmail.toLowerCase() === userEmail) ||
                      (order.userId && String(order.userId) === String(req.user.id));
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone = '',
      customerAddress = '',
      customerCountry = 'US',
      items,
      couponCode,
      currency = 'USD',
      paymentMethod = 'card',
      paymentStatus = 'paid'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.'
      });
    }

    if (!customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and email are required.'
      });
    }

    const settings = db.getSettings();
    const books = db.getCollection('books');
    const validatedItems = [];
    let calculatedSubtotalUSD = 0;

    // Validate books and stock
    for (const item of items) {
      const book = books.find(b => String(b.id) === String(item.id));
      if (!book) {
        return res.status(400).json({
          success: false,
          message: `Book with ID ${item.id} not found in catalog.`
        });
      }

      const qty = parseInt(item.qty, 10) || 1;
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for book "${book.title}".`
        });
      }

      if (book.stock !== undefined && book.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${book.title}". Available: ${book.stock}, Requested: ${qty}`
        });
      }

      const cp = (book.countryPricing && typeof book.countryPricing === 'object') ? book.countryPricing : {};
      const targetCurr = (currency || settings.defaultCurrency || 'USD').toUpperCase().trim();
      const targetCountry = (customerCountry || '').toUpperCase().trim();

      // Check if manual fixed price is defined for currency or country
      let itemPriceInTargetCurrency = null;
      if (cp[targetCurr] !== undefined && !isNaN(Number(cp[targetCurr]))) {
        itemPriceInTargetCurrency = Number(cp[targetCurr]);
      } else if (targetCountry && cp[targetCountry] !== undefined && !isNaN(Number(cp[targetCountry]))) {
        itemPriceInTargetCurrency = Number(cp[targetCountry]);
      }

      const itemPriceUSD = Number(book.priceUSD || 0);
      calculatedSubtotalUSD += itemPriceUSD * qty;

      const rates = settings.exchangeRates || { USD: 1.0 };
      const exRate = rates[targetCurr] || 1.0;

      validatedItems.push({
        id: book.id,
        title: book.title,
        author: book.author,
        priceUSD: itemPriceUSD,
        price: itemPriceInTargetCurrency !== null ? itemPriceInTargetCurrency : Number((itemPriceUSD * exRate).toFixed(2)),
        manualPriceUsed: itemPriceInTargetCurrency !== null,
        countryPricing: cp,
        qty,
        image: book.image || ''
      });
    }

    // Handle Coupon Discount
    let discountUSD = 0;
    if (couponCode) {
      const coupons = db.getCollection('coupons');
      const coupon = coupons.find(c => c.code && c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active);
      if (coupon) {
        if (!coupon.minOrderUSD || calculatedSubtotalUSD >= coupon.minOrderUSD) {
          const discountPercent = Number(coupon.discountPercent) || 0;
          discountUSD = Number(((calculatedSubtotalUSD * discountPercent) / 100).toFixed(2));
        }
      }
    }

    // Shipping & Tax
    const freeShippingAbove = Number(settings.freeShippingAbove) || 0;
    const shippingFee = (freeShippingAbove > 0 && calculatedSubtotalUSD >= freeShippingAbove) ? 0 : Number(settings.shippingFee || 0);
    const taxRate = Number(settings.taxRate || 0);
    const taxableAmount = Math.max(0, calculatedSubtotalUSD - discountUSD);
    const taxUSD = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const totalUSD = Number(Math.max(0, taxableAmount + shippingFee + taxUSD).toFixed(2));

    // Currency Conversion / Manual Price Calculation
    const targetCurrency = (currency || settings.defaultCurrency || 'USD').toUpperCase();
    const rates = settings.exchangeRates || { USD: 1.0 };
    const exchangeRate = rates[targetCurrency] || 1.0;

    const hasAnyManual = validatedItems.some(it => it.manualPriceUsed);
    let convertedTotal;
    if (hasAnyManual) {
      const itemsTotal = validatedItems.reduce((sum, it) => sum + (it.price * it.qty), 0);
      const taxTarget = Number(((itemsTotal * taxRate) / 100).toFixed(2));
      convertedTotal = Number((itemsTotal + taxTarget).toFixed(2));
    } else {
      convertedTotal = Number((totalUSD * exchangeRate).toFixed(2));
    }

    // Generate Order Number
    const orderCount = db.getCollection('orders').length + 1;
    const orderNumber = `BS-${String(orderCount).padStart(5, '0')}`;

    // Deduct stock
    for (const item of validatedItems) {
      const book = books.find(b => String(b.id) === String(item.id));
      if (book && book.stock !== undefined) {
        const newStock = Math.max(0, book.stock - item.qty);
        db.update('books', book.id, { stock: newStock });
      }
    }

    // Create Order Record
    const newOrder = db.insert('orders', {
      orderNumber,
      customerName: customerName.trim(),
      customerEmail: customerEmail.toLowerCase().trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerCountry: (customerCountry || 'US').toUpperCase(),
      items: validatedItems,
      subtotalUSD: calculatedSubtotalUSD,
      discountUSD,
      shippingUSD: shippingFee,
      taxUSD,
      totalUSD,
      currency: targetCurrency,
      exchangeRate,
      convertedTotal,
      paymentMethod,
      paymentStatus,
      status: 'processing',
      couponCode: couponCode ? couponCode.toUpperCase().trim() : undefined,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: newOrder
    });
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const existing = db.findById('orders', id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found.`
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const updates = {};
    if (status) updates.status = status.toLowerCase();
    if (paymentStatus) updates.paymentStatus = paymentStatus.toLowerCase();

    const updated = db.update('orders', id, updates);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus
};
