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
router.get("/earnings", isUser, getTeacherEarnings);
router.get("/transactions", isUser, getTeacherTransactions);
router.get("/teacher-payment-stats", isUser, getTeacherPaymentStats);
router.post("/withdraw", isUser, requestWithdrawal);
router.get("/admin/withdrawals", isUser, getAllWithdrawals);
router.put("/admin/withdrawals/:id/update-stripe-id", isUser, updateStripeId);



export default router;
