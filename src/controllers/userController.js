const bcrypt = require('bcryptjs');
const db = require('../db/jsonDb');

const getUsers = async (req, res, next) => {
  try {
    const users = db.getCollection('users');
    // Hide password hashes from response
    const safeUsers = users.map(({ password, passwordHash, ...safe }) => safe);

    res.status(200).json({
      success: true,
      count: safeUsers.length,
      data: safeUsers
    });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer', country = 'US', currency = 'USD' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = db.getCollection('users');

    if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = db.insert('users', {
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'customer',
      country,
      currency,
      createdAt: new Date().toISOString()
    });

    const { password: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: safeUser
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = db.findById('users', id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found.`
      });
    }

    // Protect primary admin from deletion
    if (user.email === 'admin@booksaw.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete primary root administrator account.'
      });
    }

    db.delete('users', id);

    res.status(200).json({
      success: true,
      message: `User with ID ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser
};
