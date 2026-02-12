import Referral from "../Models/Referral.model.js";

// Create Referral (course-specific)
export const createReferral = async (req, res) => {
  try {
    const { courseId, discountType, discountValue, isActive, startDate, endDate } = req.body;
    const adminId = req.user._id;

    if (!courseId) {
      return res.status(400).json({ error: true, message: "Course is required" });
    }

    if (!discountValue || discountValue <= 0) {
      return res.status(400).json({ error: true, message: "Discount value must be greater than 0" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ error: true, message: "Percentage discount cannot exceed 100%" });
    }

    // Check if an active referral already exists for this course
    if (isActive !== false) {
      const existing = await Referral.findOne({ courseId, isActive: true });
      if (existing) {
        return res.status(400).json({
          error: true,
          message: "An active referral already exists for this course.",
        });
      }
    }

    const referral = new Referral({
      courseId,
      discountType: discountType || "percentage",
      discountValue,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: adminId,
    });

    await referral.save();

    return res.status(201).json({
      success: true,
      message: "Referral created successfully",
      referral,
    });
  } catch (error) {
    console.error("Error creating referral:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};

// Update Referral
export const updateReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, discountType, discountValue, isActive, startDate, endDate } = req.body;

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({ error: true, message: "Referral not found" });
    }

    if (discountValue !== undefined && discountValue <= 0) {
      return res.status(400).json({ error: true, message: "Discount value must be greater than 0" });
    }

    const targetDiscountType = discountType || referral.discountType;
    const targetDiscountValue = discountValue !== undefined ? discountValue : referral.discountValue;

    if (targetDiscountType === "percentage" && targetDiscountValue > 100) {
      return res.status(400).json({ error: true, message: "Percentage discount cannot exceed 100%" });
    }

    // If activating, check for existing active referral for the course
    if (isActive === true && !referral.isActive) {
      const targetCourseId = courseId || referral.courseId;
      const existing = await Referral.findOne({
        _id: { $ne: id },
        courseId: targetCourseId,
        isActive: true,
      });
      if (existing) {
        return res.status(400).json({
          error: true,
          message: "Cannot activate. Another active referral already exists for this course.",
        });
      }
    }

    if (courseId) referral.courseId = courseId;
    if (discountType) referral.discountType = discountType;
    if (discountValue !== undefined) referral.discountValue = discountValue;
    if (isActive !== undefined) referral.isActive = isActive;
    if (startDate !== undefined) referral.startDate = startDate;
    if (endDate !== undefined) referral.endDate = endDate;

    await referral.save();

    return res.status(200).json({
      success: true,
      message: "Referral updated successfully",
      referral,
    });
  } catch (error) {
    console.error("Error updating referral:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};

// Delete Referral
export const deleteReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Referral.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: true, message: "Referral not found" });
    }
    return res.status(200).json({ success: true, message: "Referral deleted successfully" });
  } catch (error) {
    console.error("Error deleting referral:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};

// Get all referrals (admin)
export const getAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate("courseId", "courseTitle")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, referrals });
  } catch (error) {
    console.error("Error listing referrals:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};

// Get active referral for a course (public)
export const getActiveReferral = async (req, res) => {
  try {
    const { courseId } = req.query;
    const now = new Date();

    if (!courseId) {
      return res.status(400).json({ error: true, message: "courseId is required" });
    }

    const referral = await Referral.findOne({
      courseId,
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    });

    return res.status(200).json({
      success: true,
      referral: referral || null,
    });
  } catch (error) {
    console.error("Error fetching active referral:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};
