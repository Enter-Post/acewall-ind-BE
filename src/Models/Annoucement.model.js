import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },        // Cloudinary secure URL
  publicId: { type: String },                   // Cloudinary public ID
  filename: { type: String },                   // Original filename
  type: { type: String },                       // MIME type
});

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    attachments: [attachmentSchema],            // array of objects
    links: [
      {
        type: String,                           // external URLs
      },
    ],
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseSch",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
