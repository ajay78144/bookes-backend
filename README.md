# 📚 BookSaw Standalone Production Backend REST API

Dedicated **Production Backend REST API** for the **BookSaw** online digital e-book platform. Built with **Node.js, Express.js, MongoDB Atlas (Mongoose), official Razorpay SDK, Helmet security, CORS, JWT, and bcrypt**.

---

## 🏗 Pure Backend Directory Structure

```
d:/Book-backend/
├── src/
│   ├── config/
│   │   ├── config.js              # Environment, MongoDB & CORS configuration
│   │   └── razorpay.js            # Dynamic Razorpay client & credentials management
│   ├── controllers/
│   │   ├── adminController.js     # Admin metrics, orders, settings & refund actions
│   │   ├── authController.js      # JWT registration, login & bcrypt hashing
│   │   ├── blogController.js      # Blog post management
│   │   ├── bookController.js      # E-Book catalog, search & inventory
│   │   ├── couponController.js    # Discounts & promo code verification
│   │   ├── currencyController.js  # Exchange rates & currency conversion
│   │   ├── orderController.js     # Checkout, order creation & status updates
│   │   ├── paymentController.js   # Razorpay order create, HMAC verify & webhooks
│   │   ├── pricingController.js   # Country-specific pricing rules
│   │   ├── settingsController.js  # Store configuration & tax/shipping settings
│   │   ├── uploadController.js    # Multer image & PDF file storage
│   │   └── userController.js      # User management & library licenses
│   ├── db/
│   │   ├── jsonDb.js              # Atomic JSON persistence engine
│   │   ├── mongoConnect.js        # MongoDB Atlas connection handler
│   │   └── seed.js                # Initial seed data (default admin & books)
│   ├── middleware/
│   │   ├── auth.js                # JWT verification & Admin RBAC guard
│   │   ├── errorHandler.js        # Centralized error & 404 response handler
│   │   └── upload.js              # Multer file upload validation
│   ├── models/                    # Mongoose database schemas & models
│   │   ├── Blog.js                # Blog schema
│   │   ├── Book.js                # Book catalog schema
│   │   ├── Coupon.js              # Discount coupons schema
│   │   ├── Order.js               # Order schema with Razorpay IDs & licenses
│   │   ├── PricingRule.js         # Country pricing rules schema
│   │   ├── Setting.js             # Global store settings schema
│   │   ├── User.js                # Users schema with digital library
│   │   └── index.js               # Master models index
│   ├── routes/
│   │   ├── adminRoutes.js         # /api/admin/*
│   │   ├── authRoutes.js          # /api/auth/*
│   │   ├── blogRoutes.js          # /api/blogs/*
│   │   ├── bookRoutes.js          # /api/books/*
│   │   ├── couponRoutes.js        # /api/coupons/*
│   │   ├── currencyRoutes.js      # /api/currency/*
│   │   ├── index.js               # Master API router
│   │   ├── orderRoutes.js         # /api/orders/*
│   │   ├── paymentRoutes.js       # /api/payment/*
│   │   ├── pricingRoutes.js       # /api/pricing/*
│   │   ├── settingsRoutes.js      # /api/settings/*
│   │   ├── uploadRoutes.js        # /api/upload/*
│   │   └── userRoutes.js          # /api/users/*
│   ├── services/
│   │   ├── emailService.js        # Nodemailer order invoice & digital license emails
│   │   └── razorpayService.js     # Razorpay orders, HMAC-SHA256 verification & refunds
│   ├── utils/
│   │   └── currencySync.js        # Forex rates sync helper
│   └── app.js                     # Express app, Helmet, CORS, body parsers
├── data/
│   └── database.json              # Local persistent JSON database
├── uploads/
│   ├── covers/                    # Uploaded book covers (/uploads/covers/...)
│   └── pdfs/                      # Uploaded PDF e-books (/uploads/pdfs/...)
├── .env                           # Environment configuration
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules (.env, node_modules)
├── package.json                   # Backend dependencies
├── server.js                      # Root server entry point (Port 8000)
└── test-endpoints.js              # Comprehensive REST API & Razorpay test suite
```

---

## ⚙️ Environment Variables (.env)

```env
PORT=8000
JWT_SECRET=booksaw_super_secure_jwt_secret_key_2026
NODE_ENV=development

# MongoDB Atlas Database URI
MONGO_URI=mongodb+srv://ajay781442:kambojboy78@cluster0.gearez4.mongodb.net/Crickotv-Backend?retryWrites=true&w=majority

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=sL0GfK4c1vX7mKq8R3eZpY1u
RAZORPAY_WEBHOOK_SECRET=booksaw_webhook_secret_key_2026
RAZORPAY_MODE=test
CURRENCY=INR
RAZORPAY_STORE_NAME=BookSaw E-Books
```

---

## 💳 Razorpay REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/payment/create-order` | Validates cart, converts subunits (paise), creates Razorpay order |
| `POST` | `/api/payment/verify` | Mandatory HMAC-SHA256 signature verification, unlocks licenses |
| `POST` | `/api/payment/webhook` | Handles `payment.captured`, `payment.failed`, `refund.processed` |
| `POST` | `/api/payment/create-intent` | Compatibility checkout intent creation |

---

## 🛡️ Admin API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Sales, revenue, Razorpay collected, readers, live status badge |
| `GET` | `/api/admin/orders` | Paginated orders with search and filter (`paid`, `pending`, `refunded`) |
| `GET` | `/api/admin/settings/razorpay` | Returns active Razorpay configuration with masked secret |
| `PUT` | `/api/admin/settings/razorpay` | Updates Razorpay credentials, mode, and currency |
| `POST` | `/api/admin/settings/razorpay/test-connection` | Live connection test ping with Razorpay API |
| `POST` | `/api/admin/orders/:id/refund` | Processes partial/full refund via Razorpay Refund API |
| `POST` | `/api/admin/orders/:id/resend-access` | Resends e-book access email & invoice to customer |
| `GET` | `/api/admin/users` | Registered users list with digital library counts |

---

## 🧪 Running the Backend & Test Suite

```bash
# Start backend server
npm start
# or
node server.js

# Run test suite
node test-endpoints.js
```
