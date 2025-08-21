import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema({
  star: { type: Number, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdby: { type: mongoose.Schema.Types.ObjectId, required: true },
});
const Rating = mongoose.model("Rating", RatingSchema);

export default Rating;
