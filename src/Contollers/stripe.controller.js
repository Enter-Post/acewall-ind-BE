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
      stripeId: account.id,
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


export const createCheckoutSessionConnect = async (req, res) => {
  const { courseId, studentId } = req.body;

  try {
    const course = await CourseSch.findById(courseId).populate("createdby");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const user = course.createdby;

    const teacher = await User.findById(user);

    const subscriptionData = {
      application_fee_percent: 20,
      transfer_data: {
        destination: teacher.stripeAccountId,
      },
    };

    const trialDays = course.freeTrialMonths

    // Add trial only if > 0
    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays * 30; // Convert months to days
    }

    if (!user) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (!teacher.stripeAccountId) {
      return res.status(400).json({
        neetsOnboarding: true,
        error: "Teacher payout not enabled"
      });
    }

    // FREE COURSE
    if (course.paymentType === "FREE") {
      await Enrollment.create({ student: studentId, course: courseId });
      return res.json({ success: true, free: true });
    }

const amount = course.price * 100; // cents
const platformFee = Math.round(amount * 0.20); // 20%

    // ONE-TIME PAYMENT
    if (course.paymentType === "ONETIME") {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        allow_promotion_codes: true,

        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: course.courseTitle,
              description: course.courseDescription,
            },
            unit_amount: course.price * 100,
          },
          quantity: 1,
        }],

        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: teacher.stripeAccountId,
          },
        },

        metadata: {
          courseId,
          studentId,
          teacherId: teacher._id.toString(),
          paymentType: "ONETIME",
        },

        success_url: `${process.env.CLIENT_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/student/payment-cancelled`,
      });

      return res.json({ success: true, url: session.url });
    }

    // SUBSCRIPTION
    if (course.paymentType === "SUBSCRIPTION") {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        allow_promotion_codes: true,

        line_items: [{
          price: course.stripePriceId,
          quantity: 1,
        }],

        subscription_data: subscriptionData,

        metadata: {
          courseId,
          studentId,
          teacherId: teacher._id.toString(),
          paymentType: "SUBSCRIPTION",
        },

        success_url: `${process.env.CLIENT_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/student/payment-cancelled`,
      });

      return res.json({ success: true, url: session.url });
    }

  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const handleStripeWebhookConnect = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      /**
       * ================================
       * CHECKOUT COMPLETED
       * ================================
       */
      case "checkout.session.completed": {
        const session = event.data.object;

        const {
          courseId,
          studentId,
          teacherId,
          paymentType,
        } = session.metadata || {};

        if (!courseId || !studentId) break;

        // 🔒 Prevent duplicate purchase
        const existingPurchase = await Purchase.findOne({
          stripeSessionId: session.id,
        });

        if (!existingPurchase) {
          await Purchase.create({
            student: studentId,
            course: courseId,
            teacher: teacherId,
            stripeSessionId: session.id,
            paymentIntentId: session.payment_intent || null,
            subscriptionId: session.subscription || null,
            stripeCustomerId: session.customer,
            amount: session.amount_total
              ? session.amount_total / 100
              : 0,
            currency: session.currency,
            status: "completed",
            paymentMethod: "stripe",
            paymentType,
          });
        }

        /**
         * ================================
         * SUBSCRIPTION ENROLLMENT
         * ================================
         */
        if (paymentType === "SUBSCRIPTION" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );

          const shouldEnroll =
            subscription.status === "active" ||
            subscription.status === "trialing";

          if (shouldEnroll) {
            const alreadyEnrolled = await Enrollment.findOne({
              student: studentId,
              course: courseId,
            });

            if (!alreadyEnrolled) {
              await Enrollment.create({
                student: studentId,
                course: courseId,
                subscriptionId: session.subscription,
              });
            }
          }
        }

        /**
         * ================================
         * ONE-TIME PAYMENT ENROLLMENT
         * ================================
         */
        if (paymentType === "ONETIME") {
          const alreadyEnrolled = await Enrollment.findOne({
            student: studentId,
            course: courseId,
          });

          if (!alreadyEnrolled) {
            await Enrollment.create({
              student: studentId,
              course: courseId,
            });
          }
        }

        break;
      }

      /**
       * ================================
       * SUBSCRIPTION RENEWAL
       * ================================
       */
      case "invoice.paid": {
        const invoice = event.data.object;

        // Optional:
        // - extend access
        // - mark invoice as paid
        // - revenue tracking

        break;
      }

      /**
       * ================================
       * PAYMENT FAILED
       * ================================
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object;

        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          await Enrollment.updateOne(
            { subscriptionId },
            { $set: { suspended: true } }
          );
        }

        break;
      }

      /**
       * ================================
       * SUBSCRIPTION CANCELED
       * ================================
       */
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        await Enrollment.deleteOne({
          subscriptionId: subscription.id,
        });

        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

