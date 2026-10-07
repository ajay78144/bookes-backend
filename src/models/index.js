const User = require('./User');
const Book = require('./Book');
const Order = require('./Order');
const Setting = require('./Setting');
const Coupon = require('./Coupon');
const PricingRule = require('./PricingRule');
const Blog = require('./Blog');
const db = require('../db/jsonDb');

module.exports = {
  User,
  Book,
  Order,
  Setting,
  Coupon,
  PricingRule,
  Blog,
  db
};
