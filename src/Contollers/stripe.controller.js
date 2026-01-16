// src/Controllers/stripe.controller.js

import stripe from "../config/stripe.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import Purchase from "../Models/purchase.model.js"; // Assuming you have this model
import User from "../Models/user.model.js";

// Create Mobile-Only Checkout Session
export const createMobileCheckoutSession = async (req, res) => {
    const { courseId, studentId } = req.body;

    try {
        // Fetch course
        const course = await CourseSch.findById(courseId).populate("createdby");
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const teacher = course.createdby;

        // Pricing
        const amount = course.price * 100;
        const platformFee = Math.round(amount * 0.2);
        const teacherEarning = amount - platformFee;

        // Mobile deep link URLs
        const successURL = `${process.env.MOBILE_APP_SCHEME}://payment-success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelURL = `${process.env.MOBILE_APP_SCHEME}://payment-cancelled`;

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",

            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: course.courseTitle,
                            description: course.courseDescription,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],

            metadata: {
                courseId,
                studentId,
                teacherId: teacher._id.toString(),
                teacherEarning: teacherEarning.toString(),
                platformFee: platformFee.toString(),
                source: "mobile"
            },

            success_url: successURL,
            cancel_url: cancelURL,
        });

        res.status(200).json({
            success: true,
            url: session.url,
        });

    } catch (err) {
        console.error("Mobile Stripe Checkout Error:", err);
        res.status(500).json({
            error: "Failed to create mobile checkout session",
            details: err.message
        });
    }
};

// Create Checkout Session
export const createCheckoutSession = async (req, res) => {
    const { courseId, studentId, } = req.body;

    try {
        // Fetch the course and populate the teacher details
        const course = await CourseSch.findById(courseId).populate("createdby");
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const teacher = course.createdby;

        // Calculate the amount and fees
        const amount = course.price * 100; // Price in cents
        const platformFeePercentage = 0.2;
        const platformFee = Math.round(amount * platformFeePercentage); // Round the platform fee to avoid decimals
        const teacherEarning = amount - platformFee;

        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: course.courseTitle,
                            description: course.courseDescription,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                courseId,
                studentId,
                teacherId: course.createdby._id.toString(),
                teacherEarning: teacherEarning.toString(),
                platformFee: platformFee.toString(),
            },

            success_url: `${process.env.CLIENT_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/student/payment-cancelled`,
        });

        // Return the session URL for redirection to the Stripe Checkout page
        res.status(200).json({ success: true, url: session.url });
    } catch (err) {
        console.error("Stripe Checkout Error:", err);
        res.status(500).json({ error: "Failed to create checkout session", details: err.message });
    }
};

// Webhook Handler for Payment Confirmation
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object;

                const { studentId, courseId, teacherId, teacherEarning, platformFee } = session.metadata;

                const purchase = await Purchase.create({
                    student: studentId,
                    course: courseId,
                    teacher: teacherId,
                    status: "completed",
                    stripeSessionId: session.id,
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    platformFee: Number(platformFee) / 100, // ✅ convert to dollars
                    teacherEarning: Number(teacherEarning) / 100, // ✅ convert to dollars
                    paymentMethod: "stripe",
                });


                const enrollment = await Enrollment.create({
                    student: studentId,
                    course: courseId,
                });
                break;

            default:
        }

        res.status(200).json({ received: true });
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

export const stripeOnboarding = async (req, res) => {
    try {
        const teacher = req.user;

        if (!teacher.stripeAccountId) {
            return res.status(400).json({ error: "No Stripe account ID found for this user." });
        }

        const link = await stripe.accountLinks.create({
            account: teacher.stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/teacher/onboarding-failed`,
            return_url: `${process.env.CLIENT_URL}/teacher/onboarding-success`,
            type: "account_onboarding",
        });

        res.json({ url: link.url });

    } catch (error) {
        console.error("Error in stripeOnboarding:", error);
        res.status(500).json({
            error: "Failed to create onboarding link",
            details: error.message
        });
    }
}

export const checkOnboarding = async (req, res) => {
    try {
        const teacher = req.user;

        console.log(teacher, "teacher")

        if (!teacher.stripeAccountId) {
            return res.json({
                onboarded: false,
                reason: "Stripe account not created",
            });
        }

        const account = await stripe.accounts.retrieve(
            teacher.stripeAccountId
        );

        return res.json({
            onboarded: account.payouts_enabled,
            chargesEnabled: account.charges_enabled,
            detailsSubmitted: account.details_submitted,
        });

    } catch (error) {
        console.error("Stripe onboarding check error:", error);

        return res.status(400).json({
            error: "Stripe account access error",
            hint: "Account not owned by this platform or key mismatch",
        });
    }
};

export const getStripeLoginLink = async (req, res) => {
  try {
    const teacher = req.user;

    if (!teacher.stripeAccountId) {
      return res.status(400).json({
        error: "Stripe account not connected",
      });
    }

    const link = await stripe.accounts.createLoginLink(
      teacher.stripeAccountId
    );

    res.json({ url: link.url });

  } catch (err) {
    res.status(500).json({ error: "Unable to create login link" });
  }
};

