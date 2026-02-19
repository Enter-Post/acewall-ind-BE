// models/coupon.model.js

import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    stripeCouponId: {
      type: String,
      required: true,
      unique: true,
    },

    stripePromotionCodeId: {
      type: String,
      required: true,
      unique: true,
    },

    // Course reference
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },

    stripeProductId: {
      type: String,
      required: true,
    },

    stripePriceId: {
      type: String,
      required: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    percentageOff: Number,

    amountOff: Number,

    currency: {
      type: String,
      default: "usd",
    },

    duration: {
      type: String,
      enum: ["once", "repeating", "forever"],
      required: true,
      default: "once",
    },

    maxRedemptions: Number,

    expiresAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;