const db = require('../db/jsonDb');

const getPricingRules = async (req, res, next) => {
  try {
    const rules = db.getCollection('pricingRules');
    res.status(200).json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (err) {
    next(err);
  }
};

const savePricingRule = async (req, res, next) => {
  try {
    const { countryCode, countryName, currency, multiplier = 1.0, fixedDiscountPercent = 0, active = true, id } = req.body;

    if (!countryCode || !countryName) {
      return res.status(400).json({
        success: false,
        message: 'Country code and country name are required.'
      });
    }

    const cleanCode = countryCode.toUpperCase().trim();
    const rules = db.getCollection('pricingRules');

    // Check if updating existing rule
    let existing = null;
    if (id) {
      existing = rules.find(r => String(r.id) === String(id));
    } else {
      existing = rules.find(r => r.countryCode && r.countryCode.toUpperCase() === cleanCode);
    }

    if (existing) {
      const updated = db.update('pricingRules', existing.id, {
        countryCode: cleanCode,
        countryName: countryName.trim(),
        currency: (currency || existing.currency || 'USD').toUpperCase().trim(),
        multiplier: Number(multiplier) || 1.0,
        fixedDiscountPercent: Number(fixedDiscountPercent) || 0,
        active: Boolean(active === true || active === 'true')
      });

      return res.status(200).json({
        success: true,
        message: `Pricing rule for ${cleanCode} updated.`,
        data: updated
      });
    }

    const newRule = db.insert('pricingRules', {
      countryCode: cleanCode,
      countryName: countryName.trim(),
      currency: (currency || 'USD').toUpperCase().trim(),
      multiplier: Number(multiplier) || 1.0,
      fixedDiscountPercent: Number(fixedDiscountPercent) || 0,
      active: Boolean(active === true || active === 'true'),
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: `Pricing rule for ${cleanCode} created.`,
      data: newRule
    });
  } catch (err) {
    next(err);
  }
};

const deletePricingRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = db.findById('pricingRules', id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: `Pricing rule with ID ${id} not found.`
      });
    }

    db.delete('pricingRules', id);

    res.status(200).json({
      success: true,
      message: `Pricing rule for ${rule.countryName || rule.countryCode} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPricingRules,
  savePricingRule,
  deletePricingRule
};
