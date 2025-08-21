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
    courseType: {
      type: String,
      required: true,
      enum: ["credit", "non-credit"],
    },

    documents: {
      governmentId: {
        url: { type: String },
        publicId: { type: String },
        filename: { type: String },
      },
      resume: {
        url: { type: String },
        publicId: { type: String },
        filename: { type: String },
      },
      certificate: {
        url: { type: String },
        publicId: { type: String },
        filename: { type: String },
      },
      transcript: {
        url: { type: String },
        publicId: { type: String },
        filename: { type: String },
      },
    },

    remarks: { type: String, maxlength: 500, default: null },
    isAppliedReverified: {
      status: { type: Boolean, default: false },
      request: { type: String, default: null },
    },

    published: { type: Boolean, default: true },
    isVerified: {
      type: String,
      default: "pending",
      enum: ["approved", "rejected", "pending"],
    },
        price: {
      type: Number,
      required: false,
      default: 0, 
      min: 0
    },
  },
  { timestamps: true }
);

// Custom validation for documents
SchCourseSchema.pre("validate", function (next) {
  const docs = this.documents || {};
  const type = this.courseType;

  // Helper to check if a document is present (any field filled)
  function isDocPresent(doc) {
    return doc && (doc.url || doc.publicId || doc.filename);
  }

  // Helper to check if all fields are present for a document
  function isDocComplete(doc) {
    return doc && doc.url && doc.publicId && doc.filename;
  }

  // If any document is present, all its fields must be present
  for (const key of ["governmentId", "resume", "certificate", "transcript"]) {
    if (isDocPresent(docs[key]) && !isDocComplete(docs[key])) {
      return next(
        new Error(
          `All fields (url, publicId, filename) are required for ${key} if any field is provided.`
        )
      );
    }
  }

  // For credit course: all documents required
  if (type === "credit") {
    for (const key of ["governmentId", "resume", "certificate", "transcript"]) {
      if (!isDocComplete(docs[key])) {
        return next(
          new Error(
            `All documents (governmentId, resume, certificate, transcript) are required for credit courses.`
          )
        );
      }
    }
  }

  // For non-credit course: only resume and certificate required
  if (type === "non-credit") {
    for (const key of ["resume", "certificate"]) {
      if (!isDocComplete(docs[key])) {
        return next(
          new Error(
            `Resume and certificate documents are required for non-credit courses.`
          )
        );
      }
    }
  }

  next();
});

const CourseSch = mongoose.model("CourseSch", SchCourseSchema);
export default CourseSch;
