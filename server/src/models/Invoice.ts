import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'Draft' | 'Pending' | 'Unpaid' | 'Success' | 'Failed';

export interface IInvoice extends Document {
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  items: IInvoiceItem[];
  notes: string;
  user: mongoose.Types.ObjectId | string;
  // Razorpay payment link fields
  razorpayPaymentLinkId: string;
  razorpayPaymentLinkUrl: string;
  razorpayPaymentLinkShortUrl: string;
  razorpayPaymentLinkStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    client: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required'],
      trim: true,
      lowercase: true,
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
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Unpaid', 'Success', 'Failed'],
      default: 'Draft',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    items: {
      type: [InvoiceItemSchema],
      default: [],
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
    razorpayPaymentLinkId: {
      type: String,
      default: '',
    },
    razorpayPaymentLinkUrl: {
      type: String,
      default: '',
    },
    razorpayPaymentLinkShortUrl: {
      type: String,
      default: '',
    },
    razorpayPaymentLinkStatus: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate invoice number before saving
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const padded = String(count + 1).padStart(4, '0');
    this.invoiceNumber = `INV-${padded}`;
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
