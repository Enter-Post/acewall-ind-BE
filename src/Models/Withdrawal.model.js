import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  method: { type: String },   
    stripeAccountId: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

export default mongoose.model("Withdrawal", withdrawalSchema);
