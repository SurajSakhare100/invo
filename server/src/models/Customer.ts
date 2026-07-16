import mongoose, { Document, Schema } from 'mongoose';

export type CustomerStatus = 'Active' | 'Inactive' | 'Lead' | 'Blocked';

export interface ICustomer extends Document {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes: string;
  totalInvoices: number;
  totalSpent: number;
  user: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Lead', 'Blocked'],
      default: 'Active',
    },
    notes: {
      type: String,
      default: '',
    },
    totalInvoices: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
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

// Auto-generate customer ID before saving
CustomerSchema.pre('save', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    const padded = String(count + 1).padStart(4, '0');
    this.customerId = `CUST-${padded}`;
  }
  next();
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
