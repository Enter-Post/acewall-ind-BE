import express from 'express';
import { createCheckoutSession, createMobileCheckoutSession } from '../Contollers/stripe.controller.js';

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
// router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/create-checkout-session-mobile', createMobileCheckoutSession);

export default router;
