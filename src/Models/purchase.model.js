import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseSch",
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  paymentIntentId: {
    type: String,
    required: false,
  },
  stripeCustomerId: {
    type: String,
  },
  stripeSessionId: {
    type: String,
    unique: true,
  },
  subscriptionId: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "usd",
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    default: "stripe",
  },
  paymentType: {
    type: String,
  }
}, { timestamps: true });

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;
