/**
 * Modular User Model Schema Definition
 */
class UserModel {
  static schema = {
    id: { type: 'Number', primaryKey: true },
    name: { type: 'String', required: true },
    email: { type: 'String', required: true, unique: true, index: true },
    password: { type: 'String', required: true },
    role: { type: 'String', enum: ['admin', 'customer'], default: 'customer' },
    country: { type: 'String', default: 'IN' },
    currency: { type: 'String', default: 'INR' },
    library: [{ type: 'Number', ref: 'Book' }],
    licenses: [
      {
        bookId: { type: 'Number' },
        title: { type: 'String' },
        licenseKey: { type: 'String' }
      }
    ],
    createdAt: { type: 'Date', default: () => new Date().toISOString() }
  };
}

module.exports = UserModel;
