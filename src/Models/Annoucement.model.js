import mongoose from "mongoose";
const Schema = mongoose.Schema;

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
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
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", AnnouncementSchema);
export default Announcement;
