import express from 'express';
import { cancelSubscriptionAtPeriodEnd, checkOnboarding, createCheckoutSession, createCheckoutSessionConnect, createMobileCheckoutSession, getpurchases, getStripeLoginLink, stripeOnboarding, undoCancellation, renewSubscription, createAccount } from '../Contollers/stripe.controller.js';
import { isUser } from '../middlewares/Auth.Middleware.js';

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
// router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/create-checkout-session-mobile', createMobileCheckoutSession);


//Strip connect working

router.post("/onboarding", isUser, stripeOnboarding)
router.post("/checkOnboarding", isUser, checkOnboarding)
router.get("/getStripeLoginLink", isUser, getStripeLoginLink)

router.post("/create-checkout-session-connect", isUser, createCheckoutSessionConnect)
router.get("/getPurchases", isUser, getpurchases)
router.post("/cancelSubscriptionAtPeriodEnd", isUser, cancelSubscriptionAtPeriodEnd)
router.post("/undo-cancellation", isUser, undoCancellation)
router.post("/renew-subscription", isUser, renewSubscription)
router.patch("/createAccount", isUser, createAccount)
/////for test only
// router.post("/advance-test-clock", advanceTestClock)

export default router;