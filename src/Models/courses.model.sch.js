import mongoose from "mongoose";

const SchCourseSchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true, minlength: 1, maxlength: 100 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    language: { type: String, required: true, default: "English" },
    thumbnail: {
      url: { type: String, required: true },
      filename: { type: String, maxlength: 100 },
    },
    courseDescription: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2500,
    },
    teachingPoints: [{ type: String, maxlength: 120, minlength: 5 }],
    requirements: [{ type: String, maxlength: 120, minlength: 5 }],
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semesterbased: {
      type: Boolean,
      required: true,
    },
    semester: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
      },
    ],
    quarter: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quarter",
      },
    ],
    remarks: { type: String, maxlength: 500, default: null },
    isAppliedReverified: {
      status: { type: Boolean, default: false },
      request: { type: String, default: null },
    },

    published: { type: Boolean, default: false },
    isVerified: {
      type: String,
      default: "pending",
      enum: ["approved", "rejected", "pending"],
    },
    price: {
      type: Number,
      default: 0,
    },
    gradingSystem: { type: String, enum: ["normalGrading", "StandardGrading"], default: "normalGrading" },
    paymentType: { type: String, enum: ["SUBSCRIPTION", "ONETIME", "FREE"] },
    freeTrialMonths: { type: Number },
    stripePriceId: { type: String },
    stripeProductId: { type: String },
    referral: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CourseSch = mongoose.model("CourseSch", SchCourseSchema);
export default CourseSch;