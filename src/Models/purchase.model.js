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
  stripePaymentIntentId: {
    type: String,
    required: false,
  },
  stripeSessionId: {
    type: String,
    unique: true,
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
  teacherEarning: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: "stripe",
  },
}, { timestamps: true });

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;
