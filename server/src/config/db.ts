import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
const MONGO_URI = process.env.MONGO_URI!;
export async function ConnectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
  
      console.error('❌ Failed to start MongoDB:', error);
      process.exit(1);
  }
}