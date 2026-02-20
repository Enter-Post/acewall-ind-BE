import express from "express";
import {
  getTeacherEarnings,
  getTeacherTransactions,
  getTeacherPaymentStats,
  requestWithdrawal,
  getAllWithdrawals,
  updateStripeId,
} from "../Contollers/payment.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

// Routes protected by authentication middleware
/**
 * @openapi
 * /api/teacher-payment/earnings:
 *   get:
 *     tags:
 *       - Teacher Payment
 *     summary: Get teacher's earnings
 *     responses:
 *       200:
 *         description: Teacher earnings details
 */
router.get("/earnings", isUser, getTeacherEarnings);

/**
 * @openapi
 * /api/teacher-payment/transactions:
 *   get:
 *     tags:
 *       - Teacher Payment
 *     summary: Get teacher's transactions
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get("/transactions", isUser, getTeacherTransactions);

/**
 * @openapi
 * /api/teacher-payment/teacher-payment-stats:
 *   get:
 *     tags:
 *       - Teacher Payment
 *     summary: Get teacher payment statistics
 *     responses:
 *       200:
 *         description: Payment statistics
 */
router.get("/teacher-payment-stats", isUser, getTeacherPaymentStats);

/**
 * @openapi
 * /api/teacher-payment/withdraw:
 *   post:
 *     tags:
 *       - Teacher Payment
 *     summary: Request a withdrawal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Withdrawal requested successfully
 */
router.post("/withdraw", isUser, requestWithdrawal);

/**
 * @openapi
 * /api/teacher-payment/admin/withdrawals:
 *   get:
 *     tags:
 *       - Teacher Payment
 *     summary: Get all withdrawal requests (admin)
 *     responses:
 *       200:
 *         description: List of withdrawals
 */
router.get("/admin/withdrawals", isUser, getAllWithdrawals);

/**
 * @openapi
 * /api/teacher-payment/admin/withdrawals/{id}/update-stripe-id:
 *   put:
 *     tags:
 *       - Teacher Payment
 *     summary: Update Stripe ID for withdrawal (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stripeAccountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stripe ID updated
 */
router.put("/admin/withdrawals/:id/update-stripe-id", isUser, updateStripeId);



export default router;
