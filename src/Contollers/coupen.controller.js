import mongoose from "mongoose";
import CoupenCode from "../Models/coupenCode.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";

export const requestCoupen = asyncHandler(async (req, res) => {
  const newCoupon = new CoupenCode({
    ...req.body,
    demandedBy: req.user._id, // From auth middleware
    status: 'pending',
    isActive: false
  });
  await newCoupon.save();
  return res.status(201).json({ 
    message: "Request sent to Admin",
    coupon: newCoupon
  });
});

export const reviewCoupen = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const isActive = status === 'accepted';

  const coupon = await CoupenCode.findByIdAndUpdate(
    req.params.id,
    { status, isActive },
    { new: true }
  );

  if (!coupon) {
    throw new NotFoundError("Coupon not found", "CPN_001");
  }

  return res.json({
    message: "Coupon status updated",
    coupon
  });
});

export const getCouponsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const validStatuses = ['accepted', 'pending', 'rejected'];

  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      "CPN_002"
    );
  }

  const query = status ? { status } : {};

  const coupons = await CoupenCode.find(query)
    .populate("demandedBy", "firstName lastName email")
    .populate("course", "courseTitle stripeProductId")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    count: coupons.length,
    coupons,
    message: "Coupons fetched successfully"
  });
});

export const getCouponsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Ensure courseId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ValidationError("Invalid Course ID format", "CPN_003");
  }

  const coupons = await CoupenCode.find({
    course: courseId,
    demandedBy: req.user._id // Ensures teachers only see their own requests
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    count: coupons.length,
    coupons,
    message: "Coupons fetched successfully"
  });
});