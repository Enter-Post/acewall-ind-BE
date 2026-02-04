import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
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
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    trial: {
      status: { type: Boolean, default: false },
      endDate: { type: Date },
    },
    progress: {
      type: Number,
      default: 0, // Percentage completion
      min: 0,
      max: 100,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    stripeSessionId: { type: String },
    subscriptionId: { type: String },
    enrollmentType: { type: String, enum: ["ONETIME", "SUBSCRIPTION", "FREE", "TEACHERENROLLMENT"], required: true },
    status: { type: String, enum: ["ACTIVE", "PAST_DUE", "CANCELLED", "TRIAL", "APPLIEDFORCANCEL"] },
    stripeInvoiceId: { type: String },
    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Enrollment = mongoose.model("Enrollment", EnrollmentSchema);
export default Enrollment;
