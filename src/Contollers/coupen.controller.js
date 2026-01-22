import mongoose from "mongoose";
import CoupenCode from "../Models/coupenCode.model.js";

export const requestCoupen = async (req, res) => {
    try {
        const newCoupon = new CoupenCode({
            ...req.body,
            demandedBy: req.user._id, // From auth middleware
            status: 'pending',
            isActive: false
        });
        await newCoupon.save();
        res.status(201).json({ message: "Request sent to Admin" });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong"
        })
    }
}

export const reviewCoupen = async (req, res) => {
    const { status } = req.body;
    const isActive = status === 'accepted';

    const coupon = await CoupenCode.findByIdAndUpdate(
        req.params.id,
        { status, isActive },
        { new: true }
    );
    res.json(coupon);
}

export const getCouponsByStatus = async (req, res) => {
    try {
        const { status } = req.query;

        const validStatuses = ['accepted', 'pending', 'rejected'];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const query = status ? { status } : {};

        const coupons = await CoupenCode.find(query)
            .populate("demandedBy", "firstName lastName email")
            .populate("course", "courseTitle stripeProductId")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.log(error, "error")
        res.status(500).json({
            success: false,
            message: "Failed to fetch coupons",
            error: error.message
        });
    }
};

export const getCouponsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Ensure courseId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ message: "Invalid Course ID format" });
        }

        const coupons = await CoupenCode.find({
            course: courseId,
            demandedBy: req.user._id // Ensures teachers only see their own requests
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error("Error fetching coupons by course:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};