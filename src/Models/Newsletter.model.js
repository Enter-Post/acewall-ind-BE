import mongoose from "mongoose";

const NewsletterSchema = new mongoose.Schema(

    {

        email: { type: String, required: true, unique: true },

    }

);
const Newsletter = mongoose.model("School", NewsletterSchema);

export default Newsletter;
