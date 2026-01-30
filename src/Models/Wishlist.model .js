import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema(

    {

        email: { type: String, required: true, unique: true },

    }

);
const Wishlist = mongoose.model("Wishlist", WishlistSchema);

export default Wishlist;
