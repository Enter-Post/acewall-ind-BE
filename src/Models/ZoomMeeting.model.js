import mongoose from "mongoose";

const ZoomMeetingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    // Zoom Meeting ID (string to be safe, though usually number)
    meetingId: {
      type: String,
      required: true,
      unique: true,
    },
    // Host URL (starts the meeting)
    startUrl: {
      type: String,
      required: true,
    },
    // Join URL (for participants)
    joinUrl: {
      type: String,
      required: true,
    },
    password: {
      type: String,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "scheduled",
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

ZoomMeetingSchema.index({ course: 1, scheduledAt: 1 });

export const ZoomMeeting = mongoose.model("ZoomMeeting", ZoomMeetingSchema);
