const db = require('../db/jsonDb');
const { fetchLiveExchangeRates } = require('../utils/currencySync');

const getRates = async (req, res, next) => {
  try {
    const settings = db.getSettings();
    const rates = settings.exchangeRates || {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      INR: 83.5,
      CAD: 1.36,
      AUD: 1.52,
      JPY: 155.0,
      AED: 3.67,
      SAR: 3.75,
      PKR: 278.5,
      BDT: 117.2,
      SGD: 1.35
    };

    res.status(200).json({
      success: true,
      base: settings.defaultCurrency || 'USD',
      lastSyncTime: settings.lastSyncTime || new Date().toISOString(),
      rates
    });
  } catch (err) {
    next(err);
  }
};

const syncRates = async (req, res, next) => {
  try {
    const syncResult = await fetchLiveExchangeRates();

    if (syncResult && syncResult.rates) {
      const updatedSettings = db.updateSettings({
        exchangeRates: syncResult.rates,
        lastSyncTime: syncResult.lastSyncTime
      });

      return res.status(200).json({
        success: true,
        message: 'Forex exchange rates synchronized successfully.',
        source: syncResult.source,
        lastSyncTime: syncResult.lastSyncTime,
        rates: updatedSettings.exchangeRates
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to sync exchange rates with external provider.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRates,
  syncRates
};
