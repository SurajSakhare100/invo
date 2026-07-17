import mongoose, { Document, Schema } from 'mongoose';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed' | 'Refunded';
export type PaymentMethod = 'Cash' | 'Razorpay';

export interface ITransaction extends Document {
  transactionId: string;
  invoice: Schema.Types.ObjectId | string | null;
  invoiceNumber: string; // for display redundancy
  customer: Schema.Types.ObjectId | string | null;
  customerName: string; // for display redundancy
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  referenceNumber: string;
  paymentDate: Date;
  notes: string;
  user: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      unique: true,
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Razorpay'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['Success', 'Pending', 'Failed', 'Refunded'],
      default: 'Success',
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate transaction ID before saving
TransactionSchema.pre('save', async function (next) {
  if (!this.transactionId) {
    const count = await mongoose.model('Transaction').countDocuments();
    const padded = String(count + 1).padStart(4, '0');
    this.transactionId = `TXN-${padded}`;
  }
  next();
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
