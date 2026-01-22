import express from "express";
import { getCouponsByCourse, getCouponsByStatus, requestCoupen, reviewCoupen } from "../Contollers/coupen.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/request-coupon", isUser, requestCoupen)
router.patch("/coupon-review/:id", isUser, reviewCoupen)
router.get("/getCouponsByStatus", isUser, getCouponsByStatus)
router.get("/getBycourse/:courseId", isUser, getCouponsByCourse)

export default router