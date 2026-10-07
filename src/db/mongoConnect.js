const mongoose = require('mongoose');
const config = require('../config/config');
const { syncDataToMongo } = require('./syncMongo');

let isConnected = false;

/**
 * Connect to MongoDB Atlas Database & ensure initial sync
 */
async function connectDB() {
  const uri = config.MONGO_URI;

  if (!uri) {
    console.log('⚠️ MONGO_URI not configured in .env. Using atomic JSON persistence.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });

    isConnected = true;
    const dbName = conn.connection.name || 'book-Backend';
    const host = conn.connection.host || 'cluster0';
    console.log(`🍃 Connected to MongoDB Atlas: ${host}/${dbName}`);

    // Ensure collections and initial seed data are populated in Atlas
    syncDataToMongo().catch(err => {
      console.warn('MongoDB initial sync warning:', err.message);
    });

    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🍃 MongoDB reconnected.');
});

module.exports = {
  connectDB,
  isMongoConnected: () => isConnected
};
