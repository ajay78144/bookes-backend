const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const DB_FILE = path.join(config.DATA_DIR, 'database.json');

/**
 * Syncs all local JSON data into MongoDB Atlas collections.
 * Ensures users, books, orders, settings, coupons, pricingRules, blogs exist in Atlas.
 */
async function syncDataToMongo() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    console.log('⚠️ MongoDB not connected yet. Waiting for connection...');
    return false;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const localData = JSON.parse(raw);
    const db = mongoose.connection.db;

    console.log('🍃 Starting sync from database.json to MongoDB Atlas...');

    const collectionsToSync = [
      { key: 'users', coll: 'users' },
      { key: 'books', coll: 'books' },
      { key: 'orders', coll: 'orders' },
      { key: 'coupons', coll: 'coupons' },
      { key: 'pricingRules', coll: 'pricingrules' },
      { key: 'blogs', coll: 'blogs' }
    ];

    for (const item of collectionsToSync) {
      const items = localData[item.key] || [];
      const collection = db.collection(item.coll);
      const count = await collection.countDocuments();

      if (count === 0 && items.length > 0) {
        // Clone items and remove any conflicting MongoDB _id
        const cleanItems = items.map(doc => {
          const { _id, ...rest } = doc;
          return rest;
        });
        await collection.insertMany(cleanItems);
        console.log(`✅ Seeded ${cleanItems.length} documents into MongoDB [${item.coll}] collection.`);
      } else {
        console.log(`ℹ️ Collection [${item.coll}] already has ${count} documents in MongoDB.`);
      }
    }

    // Settings collection
    if (localData.settings) {
      const settingsColl = db.collection('settings');
      const settingsCount = await settingsColl.countDocuments();
      if (settingsCount === 0) {
        await settingsColl.insertOne(localData.settings);
        console.log('✅ Seeded store settings into MongoDB [settings] collection.');
      } else {
        console.log(`ℹ️ Collection [settings] already has ${settingsCount} document.`);
      }
    }

    console.log('🎉 MongoDB Atlas synchronization completed successfully!');
    return true;
  } catch (err) {
    console.error('❌ MongoDB sync error:', err.message);
    return false;
  }
}

// If run directly via command line
if (require.main === module) {
  mongoose
    .connect(config.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(async () => {
      console.log(`Connected to MongoDB: ${config.MONGO_URI.split('@')[1] || 'Atlas'}`);
      await syncDataToMongo();
      process.exit(0);
    })
    .catch(err => {
      console.error('Connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = { syncDataToMongo };
