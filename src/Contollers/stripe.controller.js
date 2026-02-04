// src/Controllers/stripe.controller.js

import { ConversationListInstance } from "twilio/lib/rest/conversations/v1/conversation.js";
import stripe from "../config/stripe.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import Purchase from "../Models/purchase.model.js";
import TestClock from "../Models/testClock.model.js";
import User from "../Models/user.model.js";
import {
  ValidationError,
  NotFoundError,
  PaymentError,
  ExternalServiceError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { withNetworkErrorHandling } from "../Utiles/networkErrorHelper.js";

// Create Mobile-Only Checkout Session
export const createMobileCheckoutSession = asyncHandler(async (req, res, next) => {
  try {
    const { courseId, studentId } = req.body;

    // Validation
    if (!courseId || !studentId) {
      throw new ValidationError("Course ID and Student ID are required", "VAL_001");
    }

    // Fetch course
    const course = await CourseSch.findById(courseId).populate("createdby");
    if (!course) {
      throw new NotFoundError("Course not found", "RES_004");
    }

    const teacher = course.createdby;

    // Pricing
    const amount = course.price * 100;
    const platformFee = Math.round(amount * 0.2);
    const teacherEarning = amount - platformFee;

    // Mobile deep link URLs
    const successURL = `${process.env.MOBILE_APP_SCHEME}://payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelURL = `${process.env.MOBILE_APP_SCHEME}://payment-cancelled`;

    // Create checkout session with network error handling
    const session = await withNetworkErrorHandling(async () => {
      return await stripe.checkout.sessions.create({
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
    }, "Stripe");

    res.status(200).json({
      success: true,
      data: { url: session.url },
      message: "Mobile checkout session created successfully",
    });

  } catch (error) {
    next(error);
  }
});

// Create Checkout Session
export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  try {
    const { courseId, studentId } = req.body;

    // Validation
    if (!courseId || !studentId) {
      throw new ValidationError("Course ID and Student ID are required", "VAL_001");
    }

    // Fetch the course and populate the teacher details
    const course = await CourseSch.findById(courseId).populate("createdby");
    if (!course) {
      throw new NotFoundError("Course not found", "RES_004");
    }

    const teacher = course.createdby;

    // Calculate the amount and fees
    const amount = course.price * 100; // Price in cents
    const platformFeePercentage = 0.2;
    const platformFee = Math.round(amount * platformFeePercentage);
    const teacherEarning = amount - platformFee;

    // Create a Stripe Checkout session with network error handling
    const session = await withNetworkErrorHandling(async () => {
      return await stripe.checkout.sessions.create({
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
    }, "Stripe");

    res.status(200).json({
      success: true,
      data: { url: session.url },
      message: "Checkout session created successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Webhook Handler for Payment Confirmation
export const handleStripeWebhook = asyncHandler(async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      throw new PaymentError("Webhook signature missing", "PAY_005");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      throw new PaymentError(`Webhook signature verification failed: ${err.message}`, "PAY_005");
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        const { studentId, courseId, teacherId, teacherEarning, platformFee } = session.metadata;

        const purchase = await Purchase.create({
          student: studentId,
          course: courseId,
          teacher: teacherId,
          status: "paid",
          stripeSessionId: session.id,
          amount: session.amount_total / 100,
          currency: session.currency,
          platformFee: Number(platformFee) / 100,
          teacherEarning: Number(teacherEarning) / 100,
          paymentMethod: "stripe",
        });

        const enrollment = await Enrollment.create({
          student: studentId,
          course: courseId,
        });
        break;

      default:
        // Log unhandled event types for monitoring
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
});

export const stripeOnboarding = asyncHandler(async (req, res, next) => {
  try {
    const teacher = req.user;

    if (!teacher.stripeAccountId) {
      throw new PaymentError("No Stripe account ID found for this user", "PAY_007");
    }

    const link = await withNetworkErrorHandling(async () => {
      return await stripe.accountLinks.create({
        account: teacher.stripeAccountId,
        refresh_url: `${process.env.CLIENT_URL}/teacher/onboarding-failed`,
        return_url: `${process.env.CLIENT_URL}/teacher/onboarding-success`,
        type: "account_onboarding",
      });
    }, "Stripe");

    res.status(200).json({
      success: true,
      data: { url: link.url },
      message: "Onboarding link created successfully",
    });

  } catch (error) {
    next(error);
  }
});

export const checkOnboarding = asyncHandler(async (req, res, next) => {
  try {
    const teacher = req.user;

    if (!teacher.stripeAccountId) {
      return res.status(200).json({
        success: true,
        data: {
          onboarded: false,
          reason: "Stripe account not created",
        },
      });
    }

    const account = await withNetworkErrorHandling(async () => {
      return await stripe.accounts.retrieve(teacher.stripeAccountId);
    }, "Stripe");

    res.status(200).json({
      success: true,
      data: {
        onboarded: account.payouts_enabled,
        stripeId: account.id,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });

  } catch (error) {
    next(error);
  }
});

export const getStripeLoginLink = asyncHandler(async (req, res, next) => {
  try {
    const teacher = req.user;

    if (!teacher.stripeAccountId) {
      throw new PaymentError("Stripe account not connected", "PAY_007");
    }

    const link = await withNetworkErrorHandling(async () => {
      return await stripe.accounts.createLoginLink(teacher.stripeAccountId);
    }, "Stripe");

    res.status(200).json({
      success: true,
      data: { url: link.url },
      message: "Login link created successfully",
    });

  } catch (error) {
    next(error);
  }
});


export const createCheckoutSessionConnect = asyncHandler(async (req, res, next) => {
  try {
    const { courseId, studentId } = req.body;

    // Validate required fields
    if (!courseId || !studentId) {
      throw new ValidationError("courseId and studentId are required", "VAL_001");
    }

    // Fetch course and populate teacher
    const course = await CourseSch.findById(courseId).populate("createdby");
    if (!course) {
      throw new NotFoundError("Course not found", "RES_001");
    }

    const user = course.createdby;
    if (!user) {
      throw new NotFoundError("Teacher not found", "RES_001");
    }

    const teacher = await User.findById(user);
    if (!teacher) {
      throw new NotFoundError("Teacher not found", "RES_001");
    }

    const student = await User.findById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found", "RES_001");
    }

    // Check if teacher has completed Stripe onboarding
    if (!teacher.stripeAccountId) {
      throw new PaymentError("Teacher payout not enabled", "PAY_008");
    }

    // Handle FREE course
    if (course.paymentType === "FREE") {
      await Enrollment.create({
        student: studentId,
        course: courseId,
        status: "ACTIVE",
        enrollmentType: "FREE",
      });

      return res.status(200).json({
        success: true,
        data: { free: true },
        message: "Enrolled in free course successfully",
      });
    }

    const amount = course.price * 100; // cents
    const platformFee = Math.round(amount * 0.20); // 20%

    // Handle ONE-TIME payment
    if (course.paymentType === "ONETIME") {
      const session = await withNetworkErrorHandling(async () => {
        return await stripe.checkout.sessions.create({
          mode: "payment",
          allow_promotion_codes: true,
          customer_creation: "always",

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
      }, "Stripe");

      return res.status(200).json({
        success: true,
        data: { url: session.url },
        message: "Checkout session created successfully",
      });
    }

    // Handle SUBSCRIPTION payment
    if (course.paymentType === "SUBSCRIPTION") {
      const subscriptionData = {
        application_fee_percent: 20,
        transfer_data: {
          destination: teacher.stripeAccountId,
        },
      };

      const trialDays = course.freeTrialMonths;

      // Add trial only if > 0
      if (trialDays > 0) {
        subscriptionData.trial_period_days = trialDays * 30; // Convert months to days
      }

      const session = await withNetworkErrorHandling(async () => {
        return await stripe.checkout.sessions.create({
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
      }, "Stripe");

      return res.status(200).json({
        success: true,
        data: { url: session.url },
        message: "Subscription checkout session created successfully",
      });
    }

    // Invalid payment type
    throw new PaymentError("Invalid payment type", "PAY_010");

  } catch (error) {
    next(error);
  }
});


// export const createCheckoutSessionConnect = async (req, res) => {
//   const { courseId, studentId } = req.body;

//   try {
//     // 1. Fetch course + teacher
//     const course = await CourseSch.findById(courseId).populate("createdby");
//     if (!course) {
//       return res.status(404).json({ error: "Course not found" });
//     }

//     const teacher = await User.findById(course.createdby);
//     if (!teacher) {
//       return res.status(404).json({ error: "Teacher not found" });
//     }

//     if (!teacher.stripeAccountId) {
//       return res.status(400).json({
//         needsOnboarding: true,
//         error: "Teacher payout not enabled",
//       });
//     }

//     // 2. FREE COURSE
//     if (course.paymentType === "FREE") {
//       await Enrollment.create({
//         student: studentId,
//         course: courseId,
//         status: "ACTIVE",
//         enrollmentType: "FREE",
//       });

//       return res.json({ success: true, free: true });
//     }

//     // 3. Create TEST CLOCK (test mode only)
//     let testClock = null;

//     if (process.env.NODE_ENV !== "production") {
//       testClock = await stripe.testHelpers.testClocks.create({
//         frozen_time: Math.floor(Date.now() / 1000),
//       });
//     }

//     // 4. Create STRIPE CUSTOMER (attached to test clock if exists)
//     const customerData = {
//       metadata: {
//         studentId,
//         courseId,
//       },
//     };

//     if (testClock) {
//       customerData.test_clock = testClock.id;
//       await TestClock.create({ testClockId: testClock.id });
//     }

//     const customer = await stripe.customers.create(customerData);

//     // 5. ONE-TIME PAYMENT
//     if (course.paymentType === "ONETIME") {
//       const amount = course.price * 100;
//       const platformFee = Math.round(amount * 0.2);

//       const session = await stripe.checkout.sessions.create({
//         customer: customer.id,
//         mode: "payment",
//         allow_promotion_codes: true,

//         line_items: [
//           {
//             price_data: {
//               currency: "usd",
//               product_data: {
//                 name: course.courseTitle,
//                 description: course.courseDescription,
//               },
//               unit_amount: amount,
//             },
//             quantity: 1,
//           },
//         ],

//         payment_intent_data: {
//           application_fee_amount: platformFee,
//           transfer_data: {
//             destination: teacher.stripeAccountId,
//           },
//         },

//         metadata: {
//           courseId,
//           studentId,
//           teacherId: teacher._id.toString(),
//           paymentType: "ONETIME",
//         },

//         success_url: `${process.env.CLIENT_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${process.env.CLIENT_URL}/student/payment-cancelled`,
//       });

//       return res.json({
//         success: true,
//         url: session.url,
//         testClockId: testClock?.id || null,
//       });
//     }

//     // 6. SUBSCRIPTION PAYMENT
//     if (course.paymentType === "SUBSCRIPTION") {
//       const subscriptionData = {
//         application_fee_percent: 20,
//         transfer_data: {
//           destination: teacher.stripeAccountId,
//         },
//       };

//       // Trial (convert months → days only if present)
//       if (course.freeTrialMonths > 0) {
//         subscriptionData.trial_period_days = course.freeTrialMonths * 30;
//       }

//       const session = await stripe.checkout.sessions.create({
//         customer: customer.id,
//         mode: "subscription",
//         allow_promotion_codes: true,

//         line_items: [
//           {
//             price: course.stripePriceId,
//             quantity: 1,
//           },
//         ],

//         subscription_data: subscriptionData,

//         metadata: {
//           courseId,
//           studentId,
//           teacherId: teacher._id.toString(),
//           paymentType: "SUBSCRIPTION",
//         },

//         success_url: `${process.env.CLIENT_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${process.env.CLIENT_URL}/student/payment-cancelled`,
//       });

//       return res.json({
//         success: true,
//         url: session.url,
//         testClockId: testClock?.id || null,
//       });
//     }

//     return res.status(400).json({ error: "Invalid payment type" });

//   } catch (err) {
//     console.error("Stripe Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// export const advanceTestClock = async (req, res) => {
//   const { testClockId, action } = req.body;

//   try {
//     if (!testClockId) {
//       return res.status(400).json({ error: "testClockId is required" });
//     }

//     // Get the current frozen time of the clock
//     const testClock = await stripe.testHelpers.testClocks.retrieve(testClockId);
//     let frozen_time = testClock.frozen_time;

//     // Decide how many seconds to advance
//     // We simulate "30-day trial" as 30 seconds, "monthly" as 30 seconds
//     let advanceSeconds;

//     switch (action) {
//       case "END_TRIAL":
//         advanceSeconds = 30; // trial ends after 30 seconds
//         break;

//       case "NEXT_MONTH":
//         advanceSeconds = 30; // subscription renews after 30 seconds
//         break;

//       default:
//         return res.status(400).json({ error: "Invalid action" });
//     }

//     const newTime = frozen_time + advanceSeconds;

//     // Advance the clock
//     const advancedClock = await stripe.testHelpers.testClocks.advance(testClockId, {
//       frozen_time: newTime,
//     });

//     res.json({
//       success: true,
//       message: `Test clock advanced by ${advanceSeconds} seconds (${action})`,
//       newFrozenTime: newTime,
//       advancedClock,
//     });
//   } catch (error) {
//     console.error("advanceTestClock error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

export const handleStripeWebhookConnect = asyncHandler(async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      throw new PaymentError("Missing stripe signature", "PAY_005");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new PaymentError(`Webhook signature verification failed: ${err.message}`, "PAY_005");
    }

    console.log("✅ Webhook received:", event.type);

    switch (event.type) {
      /**
       * ================================
       * CHECKOUT COMPLETED
       * ================================
       */
      case "checkout.session.completed": {
        const session = event.data.object;

        const { courseId, studentId, teacherId, paymentType } = session.metadata || {};

        if (!courseId || !studentId) {
          console.log("⚠️ Missing courseId or studentId in session metadata");
          break;
        }

        console.log("📋 Processing checkout for:", {
          paymentType,
          courseId,
          studentId,
          sessionId: session.id
        });

        let purchase = await Purchase.findOne({ stripeSessionId: session.id });

        // ================================
        // ONLY CREATE MANUAL INVOICE FOR ONE-TIME PAYMENTS
        // ================================
        let manualInvoiceId = null;

        if (paymentType === "ONETIME") {
          // Create invoice item
          await withNetworkErrorHandling(async () => {
            return await stripe.invoiceItems.create({
              customer: session.customer,
              amount: session.amount_total,
              currency: session.currency,
              description: `Course purchase: ${courseId}`,
              metadata: {
                courseId,
                studentId,
                teacherId,
                paymentType: paymentType,
              },
            });
          }, "Stripe");

          // Create and finalize invoice
          const invoice = await withNetworkErrorHandling(async () => {
            return await stripe.invoices.create({
              customer: session.customer,
              auto_advance: true,
              metadata: {
                courseId,
                studentId,
                teacherId,
                paymentType: paymentType,
              },
            });
          }, "Stripe");

          await withNetworkErrorHandling(async () => {
            return await stripe.invoices.finalizeInvoice(invoice.id);
          }, "Stripe");

          manualInvoiceId = invoice.id;
        }

        // ================================
        // GET RECEIPT URL - HANDLES BOTH PAYMENT TYPES
        // ================================
        let receiptUrl = null;
        let subscriptionInvoiceId = null;

        if (paymentType === "ONETIME" && session.payment_intent) {
          // ✅ ONE-TIME PAYMENT: Get receipt from payment intent
          try {
            const paymentIntent = await withNetworkErrorHandling(async () => {
              return await stripe.paymentIntents.retrieve(
                session.payment_intent,
                { expand: ["latest_charge"] }
              );
            }, "Stripe");

            if (paymentIntent.latest_charge) {
              const charge = typeof paymentIntent.latest_charge === 'string'
                ? await withNetworkErrorHandling(async () => {
                    return await stripe.charges.retrieve(paymentIntent.latest_charge);
                  }, "Stripe")
                : paymentIntent.latest_charge;

              receiptUrl = charge.receipt_url;
              console.log("✅ One-time payment receipt captured:", receiptUrl);
            }
          } catch (error) {
            console.error("⚠️ Error retrieving payment intent:", error.message);
          }
        } else if (paymentType === "SUBSCRIPTION" && session.subscription) {
          // ✅ SUBSCRIPTION: Get receipt from subscription's latest invoice
          try {
            const subscription = await withNetworkErrorHandling(async () => {
              return await stripe.subscriptions.retrieve(
                session.subscription,
                { expand: ["latest_invoice"] }
              );
            }, "Stripe");

            console.log(subscription, "subscription")

            console.log("📋 Subscription details:", {
              status: subscription.status,
              trialEnd: subscription.trial_end,
              hasTrialEnd: !!subscription.trial_end
            });

            if (subscription.latest_invoice) {
              const latestInvoice = typeof subscription.latest_invoice === 'object'
                ? await withNetworkErrorHandling(async () => {
                    return await stripe.invoices.retrieve(subscription.latest_invoice);
                  }, "Stripe")
                : subscription.latest_invoice;

              console.log(latestInvoice, "latestInvoice checking")

              // Store the subscription's invoice ID
              subscriptionInvoiceId = latestInvoice.id;

              console.log("📋 Latest invoice:", {
                id: latestInvoice.id,
                status: latestInvoice.status,
                paid: latestInvoice.paid,
                hasCharge: !!latestInvoice.charge,
                amountPaid: latestInvoice.amount_paid / 100
              });

              const charge = await withNetworkErrorHandling(async () => {
                return await stripe.charges.retrieve(latestInvoice.charge);
              }, "Stripe");

              receiptUrl = charge.receipt_url;
              console.log("✅ Subscription receipt captured at checkout:", receiptUrl);
            }
          } catch (error) {
            console.error("⚠️ Error retrieving subscription details:", error.message);
          }
        }

        // ================================
        // CREATE OR UPDATE PURCHASE
        // ================================
        if (!purchase) {
          purchase = await Purchase.create({
            student: studentId,
            course: courseId,
            teacher: teacherId,
            stripeSessionId: session.id,
            paymentIntentId: session.payment_intent || null,
            subscriptionId: session.subscription || null,
            stripeCustomerId: session.customer,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency,
            status: paymentType === "SUBSCRIPTION" && session.subscription ? "trial" : "paid",
            paymentMethod: "stripe",
            paymentType,
            // Use subscription invoice ID for subscriptions, manual invoice for one-time
            stripeInvoiceId: subscriptionInvoiceId || manualInvoiceId,
            receiptUrl: receiptUrl,
          });

          console.log("✅ Purchase created:", purchase);
        } else {
          // Update existing purchase
          purchase.receiptUrl = receiptUrl;
          if (subscriptionInvoiceId) purchase.stripeInvoiceId = subscriptionInvoiceId;
          if (manualInvoiceId) purchase.stripeInvoiceId = manualInvoiceId;
          await purchase.save();
          console.log("✅ Purchase updated with receipt");
        }

        // ================================
        // SUBSCRIPTION ENROLLMENT
        // ================================
        if (paymentType === "SUBSCRIPTION" && session.subscription) {
          const subscription = await withNetworkErrorHandling(async () => {
            return await stripe.subscriptions.retrieve(session.subscription);
          }, "Stripe");

          const subMetadata = subscription.metadata || {};

          const subStudentId = subMetadata.studentId || studentId;
          const subCourseId = subMetadata.courseId || courseId;

          const shouldEnroll = ["active", "trialing"].includes(subscription.status);

          if (shouldEnroll) {
            const alreadyEnrolled = await Enrollment.findOne({
              student: subStudentId,
              course: subCourseId,
            });

            if (!alreadyEnrolled) {
              await Enrollment.create({
                student: subStudentId,
                course: subCourseId,
                subscriptionId: session.subscription,
                status: subscription.status === "trialing" ? "TRIAL" : "ACTIVE",
                enrollmentType: "SUBSCRIPTION",
              });
              console.log("✅ Subscription enrollment created");
            } else {
              console.log("ℹ️ Student already enrolled");
            }
          }
        }

        // ================================
        // ONE-TIME PAYMENT ENROLLMENT
        // ================================
        if (paymentType === "ONETIME") {
          const alreadyEnrolled = await Enrollment.findOne({
            student: studentId,
            course: courseId,
          });

          if (!alreadyEnrolled) {
            await Enrollment.create({
              student: studentId,
              course: courseId,
              status: "ACTIVE",
              enrollmentType: "ONETIME",
              stripeInvoiceId: manualInvoiceId,
            });
            console.log("✅ One-time enrollment created");
          } else {
            console.log("ℹ️ Student already enrolled");
          }
        }

        break;
      }

      /**
       * ================================
       * INVOICE CREATED
       * ================================
       */
      case "invoice.created": {
        const invoice = event.data.object;

        console.log("📋 Invoice created:", {
          id: invoice.id,
          subscription: invoice.subscription,
          billingReason: invoice.billing_reason
        });

        await Purchase.findOneAndUpdate(
          { stripeInvoiceId: invoice.id },
          {
            billingReason: invoice.billing_reason,
            status: "draft",
          }
        );

        break;
      }

      /**
       * ================================
       * INVOICE FINALIZED
       * ================================
       */
      case "invoice.finalized": {
        const invoice = event.data.object;

        if (!invoice) break;

        console.log("📋 Invoice finalized:", {
          id: invoice.id,
          amountDue: invoice.amount_due / 100,
          status: invoice.status
        });

        await Purchase.findOneAndUpdate(
          { stripeInvoiceId: invoice.id },
          {
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
            amount: invoice.amount_due / 100,
            currency: invoice.currency,
            status: invoice.amount_due === 0 ? "trial" : "paid",
          }
        );

        break;
      }

      /**
       * ================================
       * INVOICE PAYMENT SUCCEEDED
       * This captures receipts for subscription renewals and first payments!
       * ================================
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        console.log("📋 Invoice payment succeeded:", {
          invoiceId: invoice.id,
          subscription: invoice.subscription,
          charge: invoice.charge,
          amountPaid: invoice.amount_paid / 100,
          billingReason: invoice.billing_reason
        });

        // ================================
        // GET RECEIPT URL FROM CHARGE
        // ================================
        let receiptUrl = null;

        if (invoice.charge) {
          try {
            const charge = await withNetworkErrorHandling(async () => {
              return await stripe.charges.retrieve(invoice.charge);
            }, "Stripe");

            receiptUrl = charge.receipt_url;
            console.log(`✅ Receipt URL captured: ${receiptUrl}`);
          } catch (error) {
            console.error("⚠️ Error retrieving charge:", error.message);
          }
        } else {
          console.log("⚠️ No charge found on invoice");
        }

        // ================================
        // UPDATE PURCHASE WITH RECEIPT
        // ================================
        const updateData = {
          invoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
          billingReason: invoice.billing_reason,
          status: "paid",
        };

        if (receiptUrl) {
          updateData.receiptUrl = receiptUrl;
        }

        // Try to find purchase by subscription ID first (for recurring payments)
        let purchase = null;

        if (invoice.subscription) {
          purchase = await Purchase.findOneAndUpdate(
            { subscriptionId: invoice.subscription },
            updateData,
            { new: true, sort: { createdAt: -1 } } // Get most recent
          );
        }

        // Fallback to invoice ID
        if (!purchase) {
          purchase = await Purchase.findOneAndUpdate(
            { stripeInvoiceId: invoice.id },
            updateData,
            { new: true }
          );
        }

        if (purchase) {
          console.log("✅ Purchase updated:", {
            id: purchase._id,
            receiptUrl: purchase.receiptUrl,
            status: purchase.status
          });
        } else {
          console.log("⚠️ No purchase found for invoice:", invoice.id);
        }

        // ================================
        // ACTIVATE SUBSCRIPTION ENROLLMENT
        // ================================
        if (invoice.subscription) {
          await Enrollment.updateOne(
            { subscriptionId: invoice.subscription },
            { $set: { status: "ACTIVE" } }
          );
          console.log("✅ Enrollment activated for subscription");
        }

        break;
      }

      /**
       * ================================
       * INVOICE PAID (Legacy support)
       * ================================
       */
      case "invoice.paid": {
        const invoice = event.data.object;

        const metadata = invoice.metadata || {};
        const { studentId, courseId, teacherId, paymentType } = metadata;

        console.log("📋 Invoice paid (legacy):", {
          invoiceId: invoice.id,
          hasMetadata: !!studentId && !!courseId
        });

        if (!studentId || !courseId) {
          console.log("⚠️ Missing metadata on invoice:", invoice.id);
          break;
        }

        // Get receipt URL
        let receiptUrl = null;

        if (invoice.charge) {
          try {
            const charge = await withNetworkErrorHandling(async () => {
              return await stripe.charges.retrieve(invoice.charge);
            }, "Stripe");

            receiptUrl = charge.receipt_url;
            console.log(`✅ Receipt URL: ${receiptUrl}`);
          } catch (error) {
            console.error("⚠️ Error retrieving charge:", error.message);
          }
        }

        // Update purchase
        await Purchase.findOneAndUpdate(
          { stripeInvoiceId: invoice.id },
          {
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
            billingReason: invoice.billing_reason,
            status: "paid",
            ...(receiptUrl && { receiptUrl }),
          }
        );

        // Activate subscription enrollment
        if (invoice.subscription) {
          await Enrollment.updateOne(
            { subscriptionId: invoice.subscription },
            { $set: { status: "ACTIVE" } }
          );
        }

        // One-time enrollment
        if (!invoice.subscription) {
          await Enrollment.updateOne(
            { student: studentId, course: courseId },
            {
              $setOnInsert: {
                student: studentId,
                course: courseId,
                status: "ACTIVE",
                enrollmentType: "ONETIME",
              },
            },
            { upsert: true }
          );
        }

        break;
      }

      /**
       * ================================
       * SUBSCRIPTION UPDATED
       * ================================
       */
      case "customer.subscription.updated": {
        const subscription = event.data.object;

        let status = "ACTIVE";

        if (["past_due", "unpaid"].includes(subscription.status)) {
          status = "PAST_DUE";
        }

        if (["canceled", "incomplete_expired"].includes(subscription.status)) {
          status = "CANCELLED";
        }

        console.log("📋 Subscription updated:", {
          id: subscription.id,
          status: subscription.status,
          newEnrollmentStatus: status
        });

        await Enrollment.updateOne(
          { subscriptionId: subscription.id },
          { $set: { status } }
        );

        break;
      }

      /**
       * ================================
       * PAYMENT FAILED
       * ================================
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object;

        console.log("❌ Payment failed:", {
          invoiceId: invoice.id,
          subscription: invoice.subscription
        });

        await Purchase.updateOne(
          { stripeInvoiceId: invoice.id },
          { $set: { status: "failed" } }
        );

        if (invoice.subscription) {
          await Enrollment.updateOne(
            { subscriptionId: invoice.subscription },
            { $set: { status: "PAST_DUE" } }
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

        console.log("📋 Subscription deleted:", {
          id: subscription.id,
          status: subscription.status
        });

        await Enrollment.updateOne(
          { subscriptionId: subscription.id },
          { $set: { status: "CANCELLED" } }
        );

        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
        break;
    }

    res.status(200).json({
      success: true,
      data: { received: true },
      message: "Webhook processed successfully",
    });

  } catch (error) {
    next(error);
  }
});


export const endTrial = asyncHandler(async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required", "VAL_001");
    }

    const subscription = await withNetworkErrorHandling(async () => {
      return await stripe.subscriptions.update(subscriptionId, {
        trial_end: "now",
      });
    }, "Stripe");

    console.log(subscription, "✅ Trial ended immediately for subscription:", subscriptionId);

    res.status(200).json({
      success: true,
      data: { subscription },
      message: "Trial ended successfully",
    });

  } catch (error) {
    next(error);
  }
});
