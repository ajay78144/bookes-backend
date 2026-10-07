const db = require('../db/jsonDb');

const getCoupons = async (req, res, next) => {
  try {
    const coupons = db.getCollection('coupons');
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (err) {
    next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { code, discountPercent, minOrderUSD = 0, expiryDate, active = true } = req.body;

    if (!code || discountPercent === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and discountPercent are required.'
      });
    }

    const cleanCode = code.toUpperCase().trim();
    const coupons = db.getCollection('coupons');

    if (coupons.some(c => c.code && c.code.toUpperCase() === cleanCode)) {
      return res.status(409).json({
        success: false,
        message: `Coupon code '${cleanCode}' already exists.`
      });
    }

    const newCoupon = db.insert('coupons', {
      code: cleanCode,
      discountPercent: Number(discountPercent),
      minOrderUSD: Number(minOrderUSD) || 0,
      expiryDate: expiryDate || '2028-12-31',
      active: Boolean(active === true || active === 'true'),
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      data: newCoupon
    });
  } catch (err) {
    next(err);
  }
};

const verifyCoupon = async (req, res, next) => {
  try {
    const { code, subtotalUSD = 0 } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Coupon code is required.'
      });
    }

    const cleanCode = code.toUpperCase().trim();
    const coupons = db.getCollection('coupons');
    const coupon = coupons.find(c => c.code && c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Coupon '${cleanCode}' is invalid.`
      });
    }

    const isActiveCoupon = coupon.active === true || coupon.isActive === true || coupon.active === undefined;
    if (!isActiveCoupon) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Coupon '${cleanCode}' is inactive.`
      });
    }

    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      // Check if expired (end of day)
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: `Coupon '${cleanCode}' expired on ${coupon.expiryDate}.`
        });
      }
    }

    const subtotal = Number(subtotalUSD) || 0;
    if (coupon.minOrderUSD && subtotal < coupon.minOrderUSD) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Minimum order amount of $${coupon.minOrderUSD} required for this coupon.`
      });
    }

    const discountPercent = Number(coupon.discountPercent) || 0;
    const discountAmountUSD = Number(((subtotal * discountPercent) / 100).toFixed(2));

    res.status(200).json({
      success: true,
      valid: true,
      code: coupon.code,
      discountPercent,
      discountAmountUSD,
      minOrderUSD: coupon.minOrderUSD || 0,
      message: `Coupon '${coupon.code}' applied! (${discountPercent}% off)`
    });
  } catch (err) {
    next(err);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = db.findById('coupons', id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Coupon with ID ${id} not found.`
      });
    }

    db.delete('coupons', id);

    res.status(200).json({
      success: true,
      message: `Coupon '${coupon.code}' deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  verifyCoupon,
  deleteCoupon
};
