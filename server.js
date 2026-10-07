const app = require('./src/app');
const config = require('./src/config/config');
const db = require('./src/db/jsonDb');
const { getRazorpayConfig } = require('./src/config/razorpay');

const PORT = config.PORT || 8000;

// Initialize and ensure seed data is loaded
db.init();

const server = app.listen(PORT, () => {
  const rzp = getRazorpayConfig();
  console.log('================================================================');
  console.log(`🚀 BookSaw Production REST API Server running on port ${PORT}`);
  console.log(`🌐 Local URL:          http://localhost:${PORT}`);
  console.log(`📚 API Root:           http://localhost:${PORT}/api`);
  console.log(`💳 Razorpay Gateway:   ${rzp.enabled ? 'ACTIVE' : 'DISABLED'} (${rzp.mode.toUpperCase()} MODE)`);
  console.log(`🔑 Razorpay Key ID:    ${rzp.keyId}`);
  console.log(`🛍️ Storefront Origin:   Allowlisted for http://localhost:5000`);
  console.log(`👤 Default Admin:      admin@booksaw.com | admin123`);
  console.log(`📖 Default Customer:   client@example.com | client123`);
  console.log('================================================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
