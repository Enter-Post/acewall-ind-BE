import Newsletter from "../Models/Newsletter.model.js";


export const subscribeToNewsletter = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email is valid
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Check if the email already exists in the newsletter list
        const existingSubscriber = await Newsletter.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ message: "You are already subscribed!" });
        }

        // Create a new subscriber
        const newSubscriber = new Newsletter({ email });
        await newSubscriber.save();

        // Send success response
        return res.status(201).json({ message: "Subscribed successfully!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while subscribing." });
    }
};

// Controller to get all subscriptions (for admin panel)
export const getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter.find();
        return res.status(200).json(subscribers);  // Send list of subscribers
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching subscribers" });
    }
};