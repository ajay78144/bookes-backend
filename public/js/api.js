/**
 * BookSaw Client API Bridge
 * Connects Frontend Pages and Admin Panel to the Backend REST API.
 * Automatically synchronizes with local state & handles token authorization.
 */

const API = {
  // Use relative '/api' when served by the Express backend, or configurable for external storefronts
  BASE_URL: (typeof window !== 'undefined' && window.BOOKSAW_API_URL) ? window.BOOKSAW_API_URL : ((typeof window !== 'undefined' && (window.location.port !== '8000' || window.location.protocol === 'file:')) ? 'http://localhost:8000/api' : '/api'),

  getToken() {
    return localStorage.getItem('bs_token') || '';
  },

  setToken(token) {
    if (token) localStorage.setItem('bs_token', token);
    else localStorage.removeItem('bs_token');
  },

  clearToken() {
    localStorage.removeItem('bs_token');
  },

  headers(custom = {}) {
    const h = { 'Content-Type': 'application/json', ...custom };
    const token = this.getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  async request(endpoint, options = {}) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.BASE_URL}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: this.headers(options.headers || {})
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.statusCode || res.status, data };
    } catch (err) {
      console.warn('API network error, falling back to local store:', err);
      return { ok: false, status: 0, error: err.message, data: null };
    }
  },

  // ─── Authentication ──────────────────────────────────────
  async register(name, email, password, country = 'IN', currency = 'INR', phone = '') {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, country, currency, phone })
    });

    if (res.ok && res.data && res.data.token) {
      this.setToken(res.data.token);
      if (typeof DB !== 'undefined') {
        DB.setCurrentUser(res.data.user);
        const existingUsers = DB.getUsers();
        if (!existingUsers.find(u => u.id === res.data.user.id)) {
          existingUsers.push(res.data.user);
          DB.saveUsers(existingUsers);
        }
      }
    }
    return res.data;
  },

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.ok && res.data && res.data.token) {
      this.setToken(res.data.token);
      if (typeof DB !== 'undefined') {
        DB.setCurrentUser(res.data.user);
      }
    }
    return res.data;
  },

  async getMe() {
    const res = await this.request('/auth/me');
    if (res.ok && res.data && res.data.user) {
      if (typeof DB !== 'undefined') {
        DB.setCurrentUser(res.data.user);
      }
      return res.data.user;
    }
    return null;
  },

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    if (typeof DB !== 'undefined') {
      DB.logout();
    }
    window.location.href = 'login.html';
  },

  // ─── Books Catalog ──────────────────────────────────────
  async getBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/books${query ? '?' + query : ''}`);
    if (res.ok && res.data && res.data.books) {
      return res.data.books;
    }
    return typeof DB !== 'undefined' ? DB.getBooks() : [];
  },

  async getBook(id) {
    const res = await this.request(`/books/${id}`);
    if (res.ok && res.data && res.data.book) {
      return res.data;
    }
    if (typeof DB !== 'undefined') {
      const b = DB.getBook(id);
      return b ? { book: b, userAccess: { isPurchased: DB.isBookPurchased(id, DB.getCurrentUser()?.id) } } : null;
    }
    return null;
  },

  async readBook(id, sample = false) {
    const endpoint = `/books/${id}/read${sample ? '?sample=1' : ''}`;
    const res = await this.request(endpoint);
    return res.data;
  },

  getDownloadPdfUrl(bookId) {
    const token = this.getToken();
    return `${this.BASE_URL}/books/${bookId}/download-pdf?token=${encodeURIComponent(token)}`;
  },

  // ─── User Library ───────────────────────────────────────
  async getUserLibrary() {
    const res = await this.request('/user/library');
    if (res.ok && res.data && res.data.library) {
      return res.data.library;
    }
    if (typeof DB !== 'undefined') {
      const u = DB.getCurrentUser();
      return u ? DB.getUserLibrary(u.id) : [];
    }
    return [];
  },

  // ─── Razorpay Payment Integration Flow ──────────────────
  async createRazorpayOrder({ amount, currency = 'INR', customer = {}, items = [] }) {
    const res = await this.request('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, customer, items })
    });
    return res;
  },

  async verifyPayment(verificationPayload) {
    const res = await this.request('/payment/verify', {
      method: 'POST',
      body: JSON.stringify(verificationPayload)
    });

    if (res.ok && res.data && res.data.success) {
      if (typeof DB !== 'undefined' && res.data.order) {
        DB.addOrder(res.data.order);
        const u = DB.getCurrentUser();
        if (u && res.data.unlockedBookIds) {
          DB.addToUserLibrary(u.id, res.data.unlockedBookIds);
        }
      }
    }
    return res;
  },

  async createPaymentIntent(payload) {
    const res = await this.request('/payment/create-intent', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res;
  },

  // ─── Orders ─────────────────────────────────────────────
  async createOrder(orderPayload) {
    const res = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
    return res.data;
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/orders${query ? '?' + query : ''}`);
    if (res.ok && res.data && res.data.orders) {
      return res.data.orders;
    }
    return typeof DB !== 'undefined' ? DB.getOrders() : [];
  },

  // ─── Admin Endpoints ────────────────────────────────────
  async adminGetStats() {
    const res = await this.request('/admin/stats');
    if (res.ok && res.data) return res.data;
    return null;
  },

  async adminGetOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/admin/orders${query ? '?' + query : ''}`);
    if (res.ok && res.data) return res.data;
    return null;
  },

  async adminGetRazorpaySettings() {
    const res = await this.request('/admin/settings/razorpay');
    if (res.ok && res.data && res.data.settings) return res.data.settings;
    return null;
  },

  async adminUpdateRazorpaySettings(settingsPayload) {
    const res = await this.request('/admin/settings/razorpay', {
      method: 'PUT',
      body: JSON.stringify(settingsPayload)
    });
    return res;
  },

  async adminTestRazorpayConnection() {
    const res = await this.request('/admin/settings/razorpay/test-connection', {
      method: 'POST'
    });
    return res;
  },

  async adminRefundOrder(orderId, amount, reason) {
    const res = await this.request(`/admin/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    });
    return res;
  },

  async adminResendAccess(orderId) {
    const res = await this.request(`/admin/orders/${orderId}/resend-access`, {
      method: 'POST'
    });
    return res;
  },

  async adminGetDashboard() {
    const res = await this.request('/admin/dashboard');
    return res.data;
  },

  async adminGetUsers() {
    const res = await this.request('/admin/users');
    return res.data;
  },

  async adminAddBook(bookData) {
    const res = await this.request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData)
    });
    return res.data;
  },

  async adminUpdateBook(id, bookData) {
    const res = await this.request(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData)
    });
    return res.data;
  },

  async adminDeleteBook(id) {
    const res = await this.request(`/books/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  // ─── Coupons ────────────────────────────────────────────
  async validateCoupon(code, subtotalUSD, subtotalINR) {
    try {
      const res = await this.request('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotalUSD, subtotalINR })
      });
      if (res.ok && res.data) return res.data;
    } catch {}
    return typeof DB !== 'undefined' ? DB.validateCoupon(code, subtotalUSD) : { valid: false, message: 'Invalid coupon' };
  },

  async adminGetCoupons() {
    try {
      const res = await this.request('/coupons');
      if (res.ok && res.data && res.data.coupons) return res.data.coupons;
    } catch {}
    return typeof DB !== 'undefined' ? DB.getCoupons() : [];
  },

  async adminAddCoupon(couponData) {
    try {
      const res = await this.request('/coupons', {
        method: 'POST',
        body: JSON.stringify(couponData)
      });
      if (res.ok && res.data) return res.data;
    } catch {}
    return typeof DB !== 'undefined' ? DB.addCoupon(couponData) : null;
  },

  async adminUpdateCoupon(id, couponData) {
    try {
      const res = await this.request(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(couponData)
      });
      if (res.ok && res.data) return res.data;
    } catch {}
    return typeof DB !== 'undefined' ? DB.updateCoupon(id, couponData) : null;
  },

  async adminDeleteCoupon(id) {
    try {
      const res = await this.request(`/coupons/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) return res.data;
    } catch {}
    return typeof DB !== 'undefined' ? DB.deleteCoupon(id) : null;
  }
};

// Make API available globally
if (typeof window !== 'undefined') {
  window.API = API;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
