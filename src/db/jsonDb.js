const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');
const { getInitialSeedData } = require('./seed');

const DB_FILE = path.join(config.DATA_DIR, 'database.json');

// Ensure necessary directories exist
[config.DATA_DIR, config.UPLOADS_DIR, config.COVERS_DIR, config.PDFS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class JsonDatabase {
  constructor() {
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const seedData = getInitialSeedData();
        fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
      } else {
        // Validate and ensure all required root keys exist
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        let data = {};
        try {
          data = JSON.parse(raw);
        } catch {
          data = {};
        }

        const seedData = getInitialSeedData();
        let changed = false;

        const collections = ['settings', 'users', 'books', 'orders', 'coupons', 'pricingRules', 'blogs'];
        collections.forEach(col => {
          if (!data[col] || (Array.isArray(data[col]) && data[col].length === 0 && Array.isArray(seedData[col]) && seedData[col].length > 0)) {
            data[col] = seedData[col] || [];
            changed = true;
          }
        });

        // Ensure default admin user is present and has bcrypt password
        const adminIndex = (data.users || []).findIndex(u => u.email && u.email.toLowerCase() === 'admin@booksaw.com');
        if (adminIndex === -1) {
          const defaultAdmin = seedData.users.find(u => u.role === 'admin');
          data.users.unshift(defaultAdmin);
          changed = true;
        }

        if (changed) {
          fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.error('[JsonDatabase] Initialization error:', err);
    }
  }

  getMongoCollName(name) {
    if (name === 'pricingRules') return 'pricingrules';
    return name;
  }

  async persistToMongo(action, colName, itemOrId, updateData = null) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
    try {
      const coll = mongoose.connection.db.collection(this.getMongoCollName(colName));
      if (action === 'insert') {
        const { _id, ...doc } = itemOrId;
        await coll.insertOne(doc);
      } else if (action === 'update') {
        const numId = Number(itemOrId);
        const strId = String(itemOrId);
        const filter = isNaN(numId) ? { id: strId } : { $or: [{ id: numId }, { id: strId }] };
        await coll.updateOne(filter, { $set: updateData }, { upsert: false });
      } else if (action === 'delete') {
        const numId = Number(itemOrId);
        const strId = String(itemOrId);
        const filter = isNaN(numId) ? { id: strId } : { $or: [{ id: numId }, { id: strId }] };
        await coll.deleteOne(filter);
      } else if (action === 'updateSettings') {
        await mongoose.connection.db.collection('settings').updateOne({}, { $set: itemOrId }, { upsert: true });
      }
    } catch (err) {
      console.warn(`[MongoDB Live Sync] Warning on ${action} (${colName}):`, err.message);
    }
  }

  read() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.init();
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[JsonDatabase] Read error:', err);
      return getInitialSeedData();
    }
  }

  write(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[JsonDatabase] Write error:', err);
      return false;
    }
  }

  getCollection(name) {
    const db = this.read();
    return db[name] || [];
  }

  findById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => String(item.id) === String(id)) || null;
  }

  insert(name, item) {
    const db = this.read();
    if (!db[name]) {
      db[name] = [];
    }

    if (!item.id) {
      const maxId = db[name].reduce((max, i) => {
        const numId = Number(i.id);
        return !isNaN(numId) && numId > max ? numId : max;
      }, 0);
      item.id = maxId + 1;
    }

    item.createdAt = item.createdAt || new Date().toISOString();
    db[name].push(item);
    this.write(db);

    // Live sync to MongoDB Atlas
    this.persistToMongo('insert', name, item).catch(() => {});

    return item;
  }

  update(name, id, updateData) {
    const db = this.read();
    if (!db[name]) return null;

    const index = db[name].findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    db[name][index] = {
      ...db[name][index],
      ...updateData,
      id: db[name][index].id, // protect ID from mutation
      updatedAt: new Date().toISOString()
    };

    this.write(db);

    // Live sync to MongoDB Atlas
    this.persistToMongo('update', name, id, updateData).catch(() => {});

    return db[name][index];
  }

  delete(name, id) {
    const db = this.read();
    if (!db[name]) return false;

    const initialLength = db[name].length;
    db[name] = db[name].filter(item => String(item.id) !== String(id));
    
    if (db[name].length !== initialLength) {
      this.write(db);

      // Live sync to MongoDB Atlas
      this.persistToMongo('delete', name, id).catch(() => {});

      return true;
    }
    return false;
  }

  getSettings() {
    const db = this.read();
    return db.settings || getInitialSeedData().settings;
  }

  updateSettings(newSettings) {
    const db = this.read();
    db.settings = {
      ...(db.settings || {}),
      ...newSettings,
      lastSyncTime: newSettings.lastSyncTime || new Date().toISOString()
    };
    this.write(db);

    // Live sync to MongoDB Atlas
    this.persistToMongo('updateSettings', 'settings', newSettings).catch(() => {});

    return db.settings;
  }

  getOrderByRazorpayOrderId(orderId) {
    if (!orderId) return null;
    const orders = this.getCollection('orders');
    return orders.find(o => o.razorpay_order_id === orderId || o.orderId === orderId) || null;
  }

  getOrderByRazorpayPaymentId(paymentId) {
    if (!paymentId) return null;
    const orders = this.getCollection('orders');
    return orders.find(o => o.razorpay_payment_id === paymentId) || null;
  }

  findUserByEmail(email) {
    if (!email) return null;
    const users = this.getCollection('users');
    const clean = email.toLowerCase().trim();
    return users.find(u => u.email && u.email.toLowerCase() === clean) || null;
  }

  unlockBooksForUser(userId, licensesOrBooks) {
    const user = this.findById('users', userId);
    if (!user) return null;

    const currentLibrary = Array.isArray(user.library) ? [...user.library] : [];
    const currentLicenses = Array.isArray(user.licenses) ? [...user.licenses] : [];

    licensesOrBooks.forEach(item => {
      const bookId = typeof item === 'object' ? item.bookId || item.id : item;
      if (bookId && !currentLibrary.includes(Number(bookId))) {
        currentLibrary.push(Number(bookId));
      }
      if (typeof item === 'object' && item.licenseKey) {
        currentLicenses.push(item);
      }
    });

    return this.update('users', userId, {
      library: currentLibrary,
      licenses: currentLicenses
    });
  }
}

const dbInstance = new JsonDatabase();
module.exports = dbInstance;
