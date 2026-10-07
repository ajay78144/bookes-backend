# 📚 BookSaw Production REST API & Admin Panel

Production-ready standalone **Backend REST API** and modern **Admin Panel** for the **BookSaw** online digital e-book store with official **Razorpay Node SDK** integration, cryptographic HMAC signature verification, JWT authentication, and modular database schemas.

---

## 🏗 Complete Folder Structure

```
d:/Book-backend/
├── src/
│   ├── config/
│   │   ├── config.js              # Environment & CORS configuration
│   │   └── razorpay.js            # Dynamic Razorpay SDK client & masked config
│   ├── controllers/
│   │   ├── adminController.js     # Admin stats, orders, razorpay settings, refunds
│   │   ├── authController.js      # JWT authentication & bcrypt hashing
│   │   ├── paymentController.js   # Razorpay order create, HMAC verify, webhooks
│   │   ├── bookController.js      # Digital catalog & book management
│   │   ├── orderController.js     # Storefront orders & delivery
│   │   ├── userController.js      # User management & library licenses
│   │   ├── couponController.js    # Discounts & promo code verification
│   │   ├── currencyController.js  # Live exchange rates & conversions
│   │   ├── pricingController.js   # Country pricing rules
│   │   ├── blogController.js      # Blog post management
│   │   ├── settingsController.js  # Global store settings
│   │   └── uploadController.js    # E-book PDF & cover uploads
│   ├── db/
│   │   ├── jsonDb.js              # Atomic persistence layer with Razorpay helpers
│   │   └── seed.js                # Initial seed data (default admin & books)
│   ├── middleware/
│   │   ├── auth.js                # JWT verification & RBAC guard
│   │   ├── errorHandler.js        # Global error & 404 handler
│   │   └── upload.js              # File upload validation
│   ├── models/                    # Modular database schema layer
│   │   ├── Book.js                # Book catalog model
│   │   ├── Order.js               # Order schema with Razorpay fields & licenses
│   │   ├── Setting.js             # Store & Razorpay configuration schema
│   │   ├── User.js                # User accounts & digital library model
│   │   └── index.js               # Models registry
│   ├── routes/
│   │   ├── adminRoutes.js         # /api/admin/*
│   │   ├── authRoutes.js          # /api/auth/*
│   │   ├── paymentRoutes.js       # /api/payment/*
│   │   ├── bookRoutes.js          # /api/books/*
│   │   ├── orderRoutes.js         # /api/orders/*
│   │   └── index.js               # Master API router
│   ├── services/
│   │   ├── emailService.js        # Nodemailer invoice & license access delivery
│   │   └── razorpayService.js     # Razorpay SDK orders, signatures, refunds, ping
│   └── app.js                     # Express app, Helmet, CORS, body parsers
├── public/                        # Built-in Admin Panel files (HTML/CSS/JS)
│   ├── dashboard.html             # Admin Dashboard overview with live status badge
│   ├── settings.html              # Razorpay credentials, test ping, help accordion
│   ├── orders.html                # Orders management, refunds modal, license viewer
│   ├── login.html                 # Admin authentication
│   ├── books.html                 # Book catalog management
│   └── js/api.js                  # Client API bridge
├── data/
│   └── database.json              # Local persistent JSON database
├── uploads/
│   ├── covers/                    # Book covers
│   └── pdfs/                      # PDF e-books
├── .env                           # Environment keys (Razorpay, JWT, Port)
├── .env.example                   # Environment template
├── package.json                   # Dependencies: razorpay, helmet, bcryptjs, jwt
├── server.js                      # Server launcher
└── test-endpoints.js              # Comprehensive API & Razorpay test suite
```

---

## ⚙️ Environment Variables (.env)

```env
PORT=8000
JWT_SECRET=booksaw_super_secure_jwt_secret_key_2026
NODE_ENV=development

# Razorpay Gateway Configuration
RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=sL0GfK4c1vX7mKq8R3eZpY1u
RAZORPAY_WEBHOOK_SECRET=booksaw_webhook_secret_key_2026
RAZORPAY_MODE=test
CURRENCY=INR
RAZORPAY_STORE_NAME=BookSaw E-Books
```

> **Dynamic Updates:** Credentials can be viewed and updated dynamically from the Admin Panel under **Site Settings > Razorpay Settings**. Changes take effect immediately without server restarts.

---

## 💳 Razorpay REST API Endpoints

### 1. Create Checkout Order
- **Endpoint:** `POST /api/payment/create-order`
- **Payload:**
  ```json
  {
    "amount": 499,
    "currency": "INR",
    "customer": {
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "phone": "+91 9876543210"
    },
    "items": [
      { "id": 1, "title": "The Great Gatsby", "price": 499, "qty": 1 }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "orderId": "order_test_...",
    "amount": 49900,
    "currency": "INR",
    "keyId": "rzp_test_1DP5mmOlF5G5ag",
    "dbOrderId": 7,
    "orderNumber": "BS-00007"
  }
  ```

### 2. Verify Payment (Cryptographic HMAC-SHA256)
- **Endpoint:** `POST /api/payment/verify`
- **Payload:**
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "<hmac_sha256_hex_digest>",
    "orderId": 7
  }
  ```
- **Actions performed upon verification:**
  1. Computes `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)`.
  2. Updates order status to `paid` and `completed`.
  3. Generates unique cryptographic digital license keys (`BSK-XXXX-XXXX-XXXX`).
  4. Automatically unlocks books in customer's account library (`user.library`).
  5. Sends invoice & digital license email via Nodemailer.

### 3. Razorpay Webhooks
- **Endpoint:** `POST /api/payment/webhook`
- **Header:** `x-razorpay-signature`
- **Supported Events:**
  - `payment.captured`: Marks order as paid.
  - `payment.failed`: Records payment failure notice.
  - `refund.processed`: Marks order as refunded.

---

## 🛡️ Admin API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Overview cards, revenue, Razorpay collected, success rate, status badge |
| `GET` | `/api/admin/orders` | Paginated orders with search (`q`), filter (`paid`, `pending`, `refunded`) |
| `GET` | `/api/admin/settings/razorpay` | Returns masked Razorpay credentials & mode |
| `PUT` | `/api/admin/settings/razorpay` | Updates Razorpay credentials, mode (`test`/`live`), currency |
| `POST` | `/api/admin/settings/razorpay/test-connection` | Live authentication test ping with Razorpay API |
| `POST` | `/api/admin/orders/:id/refund` | Triggers partial/full refund via Razorpay Refund API |
| `POST` | `/api/admin/orders/:id/resend-access` | Re-sends digital license access email & invoice |
| `GET` | `/api/admin/users` | Registered readers list with library counts |

---

## 🖥️ Standalone Admin Panel Features

Access the Admin Dashboard at:
- **`http://localhost:8000/dashboard.html`** or **`http://localhost:8000/admin`**
- Default Admin Login: **`admin@booksaw.com`** / **`admin123`**

### Key UI Capabilities:
1. **Dashboard Overview:**
   - Metrics cards: **Total Sales**, **Razorpay Collected**, **Success Rate**, **Active Books**.
   - **Live Razorpay Connection Status Badge** (`🟢 Live Mode Active` or `🟡 Test Mode Sandbox`).
   - Recent Transactions table with customer name, amount, date, Razorpay `pay_...` ID.
2. **Razorpay Settings Page:**
   - Gateway Status toggle (Enable/Disable).
   - Environment Selector (`Test Mode` vs `Live Production Mode`).
   - Razorpay Key ID and Key Secret input (with eye toggle).
   - Webhook Secret and Store Name.
   - **Test Connection Button:** Real-time ping checking API validity with status alert.
   - **Step-by-Step Help Accordion:** Instructions for obtaining keys from `https://dashboard.razorpay.com/`.
3. **Orders Management:**
   - Search by Order ID, Razorpay Payment ID, or Customer Email.
   - Status filters (`All`, `Paid`, `Pending`, `Refunded`).
   - Action buttons: View Customer License Keys, Re-send E-Book Access, Process Refund Modal.

---

## 🛍️ Connecting Customer Storefront to This Backend

The storefront runs on `http://localhost:5000`. The backend has CORS allowlisted for `http://localhost:5000`.

### Storefront Checkout Flow:
1. **Load Razorpay script in `checkout.html`:**
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```
2. **When Customer clicks "Pay with Razorpay":**
   ```javascript
   // 1. Create order on backend
   const res = await fetch('http://localhost:8000/api/payment/create-order', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       amount: totalINR,
       currency: 'INR',
       customer: { name: customerName, email: email, phone: phone },
       items: cart
     })
   });
   const data = await res.json();

   // 2. Open Razorpay Checkout modal
   const options = {
     key: data.keyId,
     amount: data.amount,
     currency: data.currency,
     name: 'BookSaw E-Books',
     order_id: data.orderId,
     handler: async function(response) {
       // 3. Verify payment signature on backend
       const verifyRes = await fetch('http://localhost:8000/api/payment/verify', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           razorpay_order_id: response.razorpay_order_id,
           razorpay_payment_id: response.razorpay_payment_id,
           razorpay_signature: response.razorpay_signature,
           orderId: data.dbOrderId
         })
       });
       const verifyData = await verifyRes.json();
       if (verifyData.success) {
         window.location.href = `order-success.html?order=${verifyData.orderId}&txn=${response.razorpay_payment_id}`;
       }
     }
   };
   new Razorpay(options).open();
   ```

---

## 🧪 Running Tests & Starting Server

```bash
# Start backend server
npm start
# or
node server.js

# Run test suite
node test-endpoints.js
```
