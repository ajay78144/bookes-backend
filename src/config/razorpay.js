const Razorpay = require('razorpay');
const config = require('./config');
const db = require('../db/jsonDb');

let razorpayInstance = null;
let currentKeyId = null;
let currentKeySecret = null;

/**
 * Returns dynamic Razorpay configuration merged from Database and .env fallback.
 */
function getActiveRazorpaySettings() {
  const settings = db.getSettings() || {};
  const rzpSettings = settings.razorpay || {};

  return {
    enabled: rzpSettings.enabled !== undefined ? rzpSettings.enabled : true,
    mode: rzpSettings.mode || config.razorpay.mode || 'test',
    keyId: rzpSettings.keyId || config.razorpay.keyId,
    keySecret: rzpSettings.keySecret || config.razorpay.keySecret,
    webhookSecret: rzpSettings.webhookSecret || config.razorpay.webhookSecret,
    currency: rzpSettings.currency || config.razorpay.currency || 'INR',
    storeName: rzpSettings.storeName || config.razorpay.storeName || 'BookSaw E-Books'
  };
}

/**
 * Returns a cached or dynamically refreshed Razorpay SDK client instance.
 * Automatically picks up dynamic credentials updated via the Admin Panel.
 */
function getRazorpayClient() {
  const activeSettings = getActiveRazorpaySettings();
  const keyId = activeSettings.keyId;
  const keySecret = activeSettings.keySecret;

  if (!razorpayInstance || currentKeyId !== keyId || currentKeySecret !== keySecret) {
    currentKeyId = keyId;
    currentKeySecret = keySecret;
    try {
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
    } catch (err) {
      console.warn('⚠️ Razorpay SDK initialization warning:', err.message);
    }
  }

  return razorpayInstance;
}

/**
 * Returns the current active Razorpay configuration with secret masked for secure display in the Admin Panel.
 */
function getRazorpayConfig() {
  const activeSettings = getActiveRazorpaySettings();
  const keySecret = activeSettings.keySecret || '';
  const maskedSecret = keySecret && keySecret.length > 8
    ? `${keySecret.substring(0, 4)}••••••••${keySecret.substring(keySecret.length - 4)}`
    : '••••••••••••';

  return {
    enabled: activeSettings.enabled,
    mode: activeSettings.mode,
    keyId: activeSettings.keyId,
    keySecretMasked: maskedSecret,
    webhookSecretConfigured: Boolean(activeSettings.webhookSecret),
    currency: activeSettings.currency,
    storeName: activeSettings.storeName
  };
}

/**
 * Updates dynamic Razorpay configuration in the database.
 */
function updateRazorpayConfig(updates) {
  const currentSettings = db.getSettings() || {};
  const currentRzp = currentSettings.razorpay || {};

  const cleanUpdates = {};
  if (updates.enabled !== undefined) cleanUpdates.enabled = Boolean(updates.enabled);
  if (updates.mode) cleanUpdates.mode = updates.mode.toLowerCase() === 'live' ? 'live' : 'test';
  if (updates.keyId) cleanUpdates.keyId = updates.keyId.trim();
  if (updates.keySecret && !updates.keySecret.includes('••••')) {
    cleanUpdates.keySecret = updates.keySecret.trim();
  }
  if (updates.webhookSecret && !updates.webhookSecret.includes('••••')) {
    cleanUpdates.webhookSecret = updates.webhookSecret.trim();
  }
  if (updates.currency) cleanUpdates.currency = updates.currency.trim().toUpperCase();
  if (updates.storeName) cleanUpdates.storeName = updates.storeName.trim();

  const newRzp = {
    ...currentRzp,
    ...cleanUpdates,
    updatedAt: new Date().toISOString()
  };

  db.updateSettings({ razorpay: newRzp });

  // Invalidate cache so client gets refreshed
  razorpayInstance = null;

  return getRazorpayConfig();
}

module.exports = {
  getActiveRazorpaySettings,
  getRazorpayClient,
  getRazorpayConfig,
  updateRazorpayConfig
};
