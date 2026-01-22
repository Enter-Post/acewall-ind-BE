import express from 'express';
import { checkOnboarding, createCheckoutSession, createCheckoutSessionConnect, createMobileCheckoutSession, endTrial, getStripeLoginLink, stripeOnboarding } from '../Contollers/stripe.controller.js';
import { isUser } from '../middlewares/Auth.Middleware.js';

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
// router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/create-checkout-session-mobile', createMobileCheckoutSession);


//Strip connect working
router.post("/endTrialNow", endTrial)


router.post("/onboarding", isUser, stripeOnboarding)
router.get("/checkOnboarding", isUser, checkOnboarding)
router.get("/getStripeLoginLink", isUser, getStripeLoginLink)

router.post("/create-checkout-session-connect", isUser, createCheckoutSessionConnect)

export default router;