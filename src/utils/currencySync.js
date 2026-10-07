const https = require('https');
const http = require('http');

/**
 * Fetch live exchange rates from open exchange rate API with safe fallback
 */
async function fetchLiveExchangeRates() {
  const fallbackRates = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.5,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 155.0,
    AED: 3.672,
    SAR: 3.75,
    PKR: 278.5,
    BDT: 117.2,
    SGD: 1.35,
    QAR: 3.64,
    OMR: 0.3845,
    KWD: 0.3085,
    BHD: 0.376,
    MYR: 4.68,
    BRL: 5.45
  };

  return new Promise((resolve) => {
    // Try public open forex endpoint
    const url = 'https://open.er-api.com/v6/latest/USD';
    const req = https.get(url, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.result === 'success' && parsed.rates) {
            const merged = { ...fallbackRates, ...parsed.rates };
            return resolve({
              success: true,
              rates: merged,
              source: 'open.er-api.com',
              lastSyncTime: new Date().toISOString()
            });
          }
          resolve({ success: true, rates: fallbackRates, source: 'fallback', lastSyncTime: new Date().toISOString() });
        } catch (e) {
          resolve({ success: true, rates: fallbackRates, source: 'fallback', lastSyncTime: new Date().toISOString() });
        }
      });
    });

    req.on('error', () => {
      resolve({ success: true, rates: fallbackRates, source: 'fallback', lastSyncTime: new Date().toISOString() });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: true, rates: fallbackRates, source: 'fallback', lastSyncTime: new Date().toISOString() });
    });
  });
}

module.exports = {
  fetchLiveExchangeRates
};
