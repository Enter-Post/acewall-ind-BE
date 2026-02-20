import mongoose from "mongoose";
import {
  ValidationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import CourseSch from "../Models/courses.model.sch.js";
import Coupon from "../Models/coupenCode.model.js";
import stripe from "../config/stripe.js";

export const createCoupon = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    courseId,
    discountType,
    percentageOff,
    amountOff,
    expiresAt,
    maxRedemptions,
    currency = "usd",
  } = req.body;

  // find course
  const course = await CourseSch.findById(courseId);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  const stripeCoupon = await stripe.coupons.create({
    percent_off:
      discountType === "percentage" ? percentageOff : undefined,

    amount_off:
      discountType === "fixed" ? amountOff * 100 : undefined,

    currency:
      discountType === "fixed" ? currency : undefined,

    duration: "once", // KEY PART

    max_redemptions: maxRedemptions,

    redeem_by: expiresAt
      ? Math.floor(new Date(expiresAt).getTime() / 1000)
      : undefined,

    applies_to: {
      products: [course.stripeProductId],
    },

    name,
  });

  // create promotion code
  const promotionCode =
    await stripe.promotionCodes.create({
      coupon: stripeCoupon.id,
      code: code.toUpperCase(),
    });

  // save in DB
  const coupon = await Coupon.create({
    name,
    code,
    stripeCouponId: stripeCoupon.id,
    stripePromotionCodeId: promotionCode.id,

    course: course._id,

    stripeProductId: course.stripeProductId,
    stripePriceId: course.stripePriceId,

    courseType: course.courseType,

    discountType,
    percentageOff,
    amountOff,

    expiresAt,
    maxRedemptions,
  });

  res.status(201).json({
    success: true,
    message: "Coupon created successfully",
    data: coupon,
  });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 

  const coupon = await Coupon.findById(id);

  if(coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Cannot update expired coupon",
    });
  }

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: "Coupon not found",
    });
  }

  // deactivate / activate promotion code in Stripe
  await stripe.promotionCodes.update(
    coupon.stripePromotionCodeId,
    {
      active: status,
    }
  );

  // update in database
  coupon.isActive = status;
  await coupon.save();

  res.status(200).json({
    success: true,
    message: `Coupon ${status ? "activated" : "deactivated"} successfully`,
    data: coupon,
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

  const coupons = await Coupon.find(query)
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

  const coupons = await Coupon.find({
    course: courseId,
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    count: coupons.length,
    coupons,
    message: "Coupons fetched successfully"
  });
});