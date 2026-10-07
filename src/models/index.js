const OrderModel = require('./Order');
const BookModel = require('./Book');
const UserModel = require('./User');
const SettingModel = require('./Setting');
const db = require('../db/jsonDb');

module.exports = {
  Order: OrderModel,
  Book: BookModel,
  User: UserModel,
  Setting: SettingModel,
  db
};
