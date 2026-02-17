import express from 'express';
import { cancelSubscriptionAtPeriodEnd, checkOnboarding, createCheckoutSession, createCheckoutSessionConnect, createMobileCheckoutSession, getpurchases, getStripeLoginLink, stripeOnboarding, undoCancellation, renewSubscription } from '../Contollers/stripe.controller.js';
import { isUser } from '../middlewares/Auth.Middleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/stripe/create-checkout-session:
 *   post:
 *     tags:
 *       - Stripe
 *     summary: Create a checkout session (web)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Checkout session created
 */
router.post('/create-checkout-session', createCheckoutSession);
// router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
/**
 * @openapi
 * /api/stripe/create-checkout-session-mobile:
 *   post:
 *     tags:
 *       - Stripe
 *     summary: Create a checkout session (mobile)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Mobile checkout session created
 */
router.post('/create-checkout-session-mobile', createMobileCheckoutSession);


//Strip connect working

router.post("/onboarding", isUser, stripeOnboarding)
router.get("/checkOnboarding", isUser, checkOnboarding)
router.get("/getStripeLoginLink", isUser, getStripeLoginLink)

router.post("/create-checkout-session-connect", isUser, createCheckoutSessionConnect)

/**
 * @openapi
 * /api/stripe/getPurchases:
 *   get:
 *     tags:
 *       - Stripe
 *     summary: Get purchases for the current user
 *     responses:
 *       200:
 *         description: Purchases list
 */
router.get("/getPurchases", isUser, getpurchases)

/**
 * @openapi
 * /api/stripe/cancelSubscriptionAtPeriodEnd:
 *   post:
 *     tags:
 *       - Stripe
 *     summary: Cancel subscription at period end
 *     responses:
 *       200:
 *         description: Cancellation scheduled
 */
router.post("/cancelSubscriptionAtPeriodEnd", isUser, cancelSubscriptionAtPeriodEnd)

router.post("/undo-cancellation", isUser, undoCancellation)
router.post("/renew-subscription", isUser, renewSubscription)

/////for test only
// router.post("/advance-test-clock", advanceTestClock)

export default router;