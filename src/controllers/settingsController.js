const db = require('../db/jsonDb');

const getSettings = async (req, res, next) => {
  try {
    const settings = db.getSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updateData = req.body;

    if (updateData.taxRate !== undefined) updateData.taxRate = Number(updateData.taxRate);
    if (updateData.shippingFee !== undefined) updateData.shippingFee = Number(updateData.shippingFee);
    if (updateData.freeShippingAbove !== undefined) updateData.freeShippingAbove = Number(updateData.freeShippingAbove);

    const updated = db.updateSettings(updateData);

    res.status(200).json({
      success: true,
      message: 'Global site settings updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings
};
