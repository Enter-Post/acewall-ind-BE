import mongoose from "mongoose";

export const connectDB = () => {
  try {
    const connect = mongoose.connect(process.env.MONGODB_URI);
    console.log("DB connected succcesfully");
  } catch (error) {
    console.log("error in DB connection", error);
  }
};