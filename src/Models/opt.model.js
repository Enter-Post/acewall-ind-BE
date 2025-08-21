import mongoose from "mongoose";

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isVerified: { type: Boolean, default: false },
  userData: { type: Object, required: true },
});

const OPT = mongoose.model("OTP", OTPSchema);

export default OPT;
