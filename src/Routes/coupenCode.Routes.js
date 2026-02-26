import express from "express";
import { getCouponsByCourse, getCouponsByStatus, createCoupon, updateCoupon, getStripeCoupons } from "../Contollers/coupen.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/createCoupon", isUser, createCoupon)
router.patch("/updateCoupon/:id", isUser, updateCoupon)
router.get("/getCouponsByStatus", isUser, getCouponsByStatus)
router.get("/getBycourse/:courseId", isUser, getCouponsByCourse)
router.get("/stripe-coupons/:courseId", getStripeCoupons);
export default router