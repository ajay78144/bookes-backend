const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const DB_FILE = path.join(config.DATA_DIR, 'database.json');

/**
 * Bi-directional synchronization between MongoDB Atlas and local JSON database.
 * 
 * 1. Pulls existing cloud records from MongoDB Atlas and hydrates database.json
 *    (Crucial for Render: restores uploaded books, custom prices, and orders when Render restarts/resets ephemeral disk).
 * 2. Seeds any missing local records (e.g. initial seed catalog) into MongoDB Atlas.
 */
async function syncDataToMongo() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    console.log('⚠️ MongoDB not connected yet. Waiting for connection...');
    return false;
  }

  try {
    let localData = {};
    if (fs.existsSync(DB_FILE)) {
      try {
        localData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      } catch {
        localData = {};
      }
    }

    const db = mongoose.connection.db;
    console.log('🍃 Starting bi-directional sync with MongoDB Atlas...');

    const collectionsToSync = [
      { key: 'users', coll: 'users' },
      { key: 'books', coll: 'books' },
      { key: 'orders', coll: 'orders' },
      { key: 'coupons', coll: 'coupons' },
      { key: 'pricingRules', coll: 'pricingrules' },
      { key: 'blogs', coll: 'blogs' }
    ];

    let dataModified = false;

    for (const item of collectionsToSync) {
      const collection = db.collection(item.coll);
      const mongoDocs = await collection.find({}).toArray();
      const localItems = Array.isArray(localData[item.key]) ? [...localData[item.key]] : [];

      if (mongoDocs.length === 0 && localItems.length > 0) {
        // MongoDB is empty, seed from local JSON
        const cleanItems = localItems.map(doc => {
          const { _id, ...rest } = doc;
          return rest;
        });
        await collection.insertMany(cleanItems);
        console.log(`✅ Seeded ${cleanItems.length} documents into MongoDB [${item.coll}].`);
      } else if (mongoDocs.length > 0) {
        // Hydrate local JSON database from MongoDB Atlas
        const mergedItems = [...localItems];

        for (const mDoc of mongoDocs) {
          const { _id, ...rest } = mDoc;
          const cleanDoc = { ...rest };
          if (_id) cleanDoc._id = _id.toString();

          const idx = mergedItems.findIndex(l => {
            if (cleanDoc.id !== undefined && l.id !== undefined && String(l.id) === String(cleanDoc.id)) {
              return true;
            }
            if (cleanDoc._id && l._id && String(l._id) === String(cleanDoc._id)) {
              return true;
            }
            return false;
          });

          if (idx !== -1) {
            // Overwrite with MongoDB Atlas data (Atlas is true persistent cloud source)
            mergedItems[idx] = { ...mergedItems[idx], ...cleanDoc };
          } else {
            mergedItems.push(cleanDoc);
          }
        }

        // Also push any local items (e.g. seed catalog) that aren't yet in MongoDB Atlas
        for (const lDoc of localItems) {
          const existsInMongo = mongoDocs.some(m => {
            if (lDoc.id !== undefined && m.id !== undefined && String(m.id) === String(lDoc.id)) {
              return true;
            }
            if (lDoc._id && m._id && String(m._id) === String(lDoc._id)) {
              return true;
            }
            return false;
          });

          if (!existsInMongo) {
            const { _id, ...rest } = lDoc;
            await collection.insertOne(rest);
            console.log(`⬆️ Pushed missing local item [${item.coll}] (id: ${lDoc.id}) into MongoDB Atlas.`);
          }
        }

        localData[item.key] = mergedItems;
        dataModified = true;
        console.log(`📥 Hydrated ${mergedItems.length} [${item.key}] from MongoDB Atlas into active state.`);
      }
    }

    // Settings sync
    const settingsColl = db.collection('settings');
    const mongoSettings = await settingsColl.findOne({});
    if (mongoSettings) {
      const { _id, ...cleanSettings } = mongoSettings;
      localData.settings = { ...(localData.settings || {}), ...cleanSettings };
      dataModified = true;
      console.log('📥 Hydrated store settings from MongoDB Atlas.');
    } else if (localData.settings) {
      await settingsColl.insertOne(localData.settings);
      console.log('✅ Seeded store settings into MongoDB [settings].');
    }

    if (dataModified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(localData, null, 2), 'utf-8');
      console.log('💾 Local database.json updated from MongoDB Atlas state.');
    }

    console.log('🎉 Bi-directional MongoDB Atlas synchronization completed successfully!');
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
