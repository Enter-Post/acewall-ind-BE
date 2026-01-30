import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
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

    /**
     * =====================
     * STRIPE REFERENCES
     * =====================
     */
    stripeSessionId: {
      type: String, // checkout.session.id
    },
    paymentIntentId: {
      type: String,
    },
    stripeInvoiceId: {
      type: String,
      unique: true, // 🔒 prevent duplicate invoices
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
    },
    subscriptionId: {
      type: String,
    },

    /**
     * =====================
     * PAYMENT DETAILS
     * =====================
     */
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
      enum: ["ONETIME", "SUBSCRIPTION", "TESTING"],
      required: true,
    },

    /**
     * =====================
     * INVOICE DATA
     * =====================
     */
    invoiceUrl: {
      type: String,
    },
    invoicePdf: {
      type: String,
    },
    billingReason: {
      type: String, // trialing, subscription_cycle, manual
    },

    /**
     * =====================
     * STATUS
     * =====================
     */
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "trial", "refunded", "draft"],
      default: "pending",
    },

    receiptUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;
