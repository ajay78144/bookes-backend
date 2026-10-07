/**
 * Modular Order Model Schema Definition
 * Compatible with Mongoose / Prisma / Relational ORMs and active JSON DB.
 */
class OrderModel {
  static schema = {
    id: { type: 'String|Number', primaryKey: true },
    orderNumber: { type: 'String', required: true, unique: true },
    customerName: { type: 'String', required: true },
    customerEmail: { type: 'String', required: true, index: true },
    customerPhone: { type: 'String', default: '' },
    customerAddress: { type: 'String', default: '' },
    customerCountry: { type: 'String', default: 'IN' },
    items: [
      {
        id: { type: 'Number', required: true },
        title: { type: 'String', required: true },
        author: { type: 'String', default: '' },
        price: { type: 'Number', required: true },
        qty: { type: 'Number', default: 1 },
        image: { type: 'String', default: '' }
      }
    ],
    amount: { type: 'Number', required: true },
    amountInPaise: { type: 'Number', required: true },
    currency: { type: 'String', default: 'INR' },
    status: {
      type: 'String',
      enum: ['pending_payment', 'paid', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
      default: 'pending_payment'
    },
    paymentMethod: { type: 'String', default: 'razorpay' },
    paymentStatus: { type: 'String', enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    
    // Razorpay Specific Fields
    razorpay_order_id: { type: 'String', index: true },
    razorpay_payment_id: { type: 'String', index: true },
    razorpay_signature: { type: 'String' },
    receipt: { type: 'String' },
    
    // Digital Licenses
    licenses: [
      {
        bookId: { type: 'Number' },
        title: { type: 'String' },
        licenseKey: { type: 'String' },
        downloadUrl: { type: 'String' }
      }
    ],

    // Refund tracking
    refundDetails: {
      refundId: { type: 'String' },
      amount: { type: 'Number' },
      reason: { type: 'String' },
      refundedAt: { type: 'Date' }
    },

    userId: { type: 'Number', default: null },
    createdAt: { type: 'Date', default: () => new Date().toISOString() },
    completedAt: { type: 'Date', default: null }
  };
}

module.exports = OrderModel;
