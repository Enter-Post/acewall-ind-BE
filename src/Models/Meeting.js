import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema(
  {
    meetingTitle: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 100 
    },
    meetingDescription: { 
      type: String, 
      maxlength: 500 
    },
    // Reference to your CourseSch model
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
    // The teacher who created the meeting
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Specific for Jitsi: This is the unique room identifier
    // Example: "course_659a_live_session_1"
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    // Optional: useful for frontend UI filters
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "cancelled"],
      default: "scheduled",
    },
    // If you want to allow anyone with a link or only enrolled
    isPrivate: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

// Indexing for faster queries when a student enters a course
MeetingSchema.index({ course: 1, startTime: -1 });

const Meeting = mongoose.model("Meeting", MeetingSchema);
export default Meeting;