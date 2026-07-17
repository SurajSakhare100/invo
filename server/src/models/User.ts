import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  company: string;
  phone?: string;
  companyEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    companyEmail: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
