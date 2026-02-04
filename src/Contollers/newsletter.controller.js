import Newsletter from "../Models/Newsletter.model.js";
import { ValidationError, ConflictError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";


export const subscribeToNewsletter = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Check if email is valid
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format", "NEWS_001");
    }

    // Check if the email already exists in the newsletter list
    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
        throw new ConflictError("You are already subscribed!", "NEWS_002");
    }

    // Create a new subscriber
    const newSubscriber = new Newsletter({ email });
    await newSubscriber.save();

    // Send success response
    return res.status(201).json({ 
        success: true,
        message: "Subscribed successfully!" 
    });
});

// Controller to get all subscriptions (for admin panel)
export const getAllSubscribers = asyncHandler(async (req, res) => {
    const subscribers = await Newsletter.find();
    return res.status(200).json({ 
        success: true,
        data: subscribers 
    });
});



