const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 8000,
  JWT_SECRET: process.env.JWT_SECRET || 'booksaw_super_secure_jwt_secret_key_2026',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  DATA_DIR: path.resolve(__dirname, '../../data'),
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
  COVERS_DIR: path.resolve(__dirname, '../../uploads/covers'),
  PDFS_DIR: path.resolve(__dirname, '../../uploads/pdfs'),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'sL0GfK4c1vX7mKq8R3eZpY1u',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'booksaw_webhook_secret_key_2026',
    mode: process.env.RAZORPAY_MODE || 'test',
    currency: process.env.CURRENCY || 'INR',
    storeName: process.env.RAZORPAY_STORE_NAME || 'BookSaw E-Books'
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ppevbwymzlgrutfcojpe.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-FKEjoWLH5D8W19tK4hmZg_Cd_gb9wj',
    bucket: process.env.SUPABASE_BUCKET || 'ebooks'
  },
  cors: {
    allowedOrigins: [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ]
  }
};
