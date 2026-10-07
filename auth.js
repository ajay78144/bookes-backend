/**
 * BookSaw Backend Authentication System
 * Handles User Registration, Login, Token generation, and Session validation.
 */

const crypto = require('crypto');
const { db } = require('./db');

// In-memory token store with disk fallback
const activeTokens = new Map();

// Generate secure authentication token
function generateToken(userId) {
  const token = 'bs_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  activeTokens.set(token, { userId: Number(userId), expiresAt });
  return token;
}

// Verify token and retrieve user
function verifyToken(token) {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const session = activeTokens.get(cleanToken);
  
  if (session && session.expiresAt > Date.now()) {
    return db.getUserById(session.userId);
  }

  // Fallback: check if token matches user email hash or direct session
  return null;
}

// Extract authenticated user from HTTP request
function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (authHeader) {
    const user = verifyToken(authHeader);
    if (user) return db.sanitizeUser(user);
  }

  // Also support ?token= query parameter for PDF download & direct links
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    const user = verifyToken(queryToken);
    if (user) return db.sanitizeUser(user);
  }

  return null;
}

// Authentication Controllers
const AuthController = {
  // Register a new client account
  register(req, res, body) {
    const { name, email, password, country, currency, phone } = body || {};

    if (!name || !name.trim()) {
      return sendJSON(res, 400, { success: false, error: 'Full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return sendJSON(res, 400, { success: false, error: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return sendJSON(res, 400, { success: false, error: 'Password must be at least 6 characters long.' });
    }

    const result = db.createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      country: country || 'US',
      currency: currency || 'USD',
      phone: phone || '',
      role: 'customer'
    });

    if (result.error) {
      return sendJSON(res, 409, { success: false, error: result.error });
    }

    const token = generateToken(result.user.id);
    return sendJSON(res, 201, {
      success: true,
      message: 'Account registered successfully! Welcome to BookSaw.',
      token,
      user: result.user
    });
  },

  // Login existing client or admin
  login(req, res, body) {
    const { email, password } = body || {};

    if (!email || !password) {
      return sendJSON(res, 400, { success: false, error: 'Email and password are required.' });
    }

    const user = db.validateUser(email, password);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'Invalid email or password. Please try again.' });
    }

    const token = generateToken(user.id);
    return sendJSON(res, 200, {
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user
    });
  },

  // Get profile of currently logged-in user
  getMe(req, res) {
    const user = getAuthUser(req);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'You are not logged in.' });
    }

    // Include updated purchased books library
    const library = db.getUserLibrary(user.id);
    return sendJSON(res, 200, {
      success: true,
      user: {
        ...user,
        libraryCount: library.length,
        purchasedBookIds: library.map(b => b.id)
      }
    });
  },

  // Logout
  logout(req, res) {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    if (authHeader) {
      const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      activeTokens.delete(cleanToken);
    }
    return sendJSON(res, 200, { success: true, message: 'Logged out successfully.' });
  }
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token'
  });
  res.end(JSON.stringify(data));
}

module.exports = {
  AuthController,
  getAuthUser,
  generateToken,
  sendJSON
};
