import mongoose from "mongoose";

const studentAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // From assessment.questions
  selectedAnswer: { type: String },
  file: [
    {
      url: { type: String, required: true },
      filename: { type: String },
      publicId: { type: String },
    },
  ],
  isCorrect: { type: Boolean },
  pointsAwarded: { type: Number }, // Can be set automatically or manually
  requiresManualCheck: { type: Boolean, default: false }, // QA type
});

const submissionSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: {
      type: [studentAnswerSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one answer must be provided.",
      },
    },
    status: {
      type: String,
      enum: ["before due date", "after due date"],
    },
    totalScore: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    graded: { type: Boolean, default: false },
    feedback: { type: String },
  },
  { timestamps: true }
);

const Submission = mongoose.model("submission", submissionSchema);

export default Submission;
