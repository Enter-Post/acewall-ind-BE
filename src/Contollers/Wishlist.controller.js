import Wishlist from "../Models/Wishlist.model .js";
import { ValidationError, ConflictError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const wishlist = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Check if email is valid
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format", "WISH_001");
    }

    // Check if the email already exists in the newsletter list
    const existingSubscriber = await Wishlist.findOne({ email });
    if (existingSubscriber) {
        throw new ConflictError("You are already subscribed!", "WISH_002");
    }

    // Create a new subscriber
    const newSubscriber = new Wishlist({ email });
    await newSubscriber.save();

    // Send success response
    return res.status(201).json({ 
        message: "Subscribed successfully!" 
    });
});

// Controller to get all subscriptions (for admin panel)
export const wishlistget = asyncHandler(async (req, res) => {
    const subscribers = await Wishlist.find();
    return res.status(200).json(subscribers);
});