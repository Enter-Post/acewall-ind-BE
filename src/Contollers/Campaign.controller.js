import Campaign from "../Models/Campaign.model.js";
import mongoose from "mongoose";

// Helper to check if a campaign is within its date range
const isCampaignDateValid = (campaign) => {
  const now = new Date();
  if (campaign.startDate && now < new Date(campaign.startDate)) return false;
  if (campaign.endDate && now > new Date(campaign.endDate)) return false;
  return true;
};

// Create Campaign
export const createCampaign = async (req, res) => {
  try {
    const { name, courseId, isActive, startDate, endDate } = req.body;
    const adminId = req.user._id;

    if (!name) {
      return res
        .status(400)
        .json({ error: true, message: "Campaign name is required" });
    }

    // Check if an active campaign already exists for this target (global or specific course)
    if (isActive !== false) {
      const query = { courseId: courseId || null, isActive: true };
      const existingActive = await Campaign.findOne(query);
      if (existingActive) {
        return res.status(400).json({
          error: true,
          message: `An active ${courseId ? "course-specific" : "global"} campaign already exists.`,
        });
      }
    }

    const campaign = new Campaign({
      name,
      courseId: courseId || null,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: adminId,
    });

    await campaign.save();

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: true, message: "Campaign name must be unique" });
    }
    console.error("Error creating campaign:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

// Update Campaign
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, startDate, endDate, courseId } = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res
        .status(404)
        .json({ error: true, message: "Campaign not found" });
    }

    // If activating, check for existing active campaign for the target
    if (isActive === true && !campaign.isActive) {
      const targetCourseId =
        courseId !== undefined ? courseId || null : campaign.courseId;
      const query = {
        _id: { $ne: id },
        courseId: targetCourseId,
        isActive: true,
      };
      const existingActive = await Campaign.findOne(query);
      if (existingActive) {
        return res.status(400).json({
          error: true,
          message: `Cannot activate. Another active ${targetCourseId ? "course-specific" : "global"} campaign already exists.`,
        });
      }
    }

    if (name) campaign.name = name;
    if (isActive !== undefined) campaign.isActive = isActive;
    if (startDate !== undefined) campaign.startDate = startDate;
    if (endDate !== undefined) campaign.endDate = endDate;
    if (courseId !== undefined) campaign.courseId = courseId || null;

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

// Delete Campaign
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Campaign.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ error: true, message: "Campaign not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

// Get Active Campaign for Course
export const getActiveCampaign = async (req, res) => {
  try {
    const { courseId } = req.query;
    const now = new Date();

    const dateFilter = {
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    };

    // 1. Check for Active Global Campaign
    const globalCampaign = await Campaign.findOne({
      courseId: null,
      isActive: true,
      ...dateFilter,
    });

    // 2. Check for course-specific campaign if courseId is provided
    let courseCampaign = null;
    if (courseId) {
      courseCampaign = await Campaign.findOne({
        courseId,
        isActive: true,
        ...dateFilter,
      });
    }

    // Course-specific campaign takes priority, fallback to global
    const campaign = courseCampaign || globalCampaign || null;

    return res.status(200).json({
      success: true,
      campaign,
      globalCampaign: globalCampaign || null,
      courseCampaign: courseCampaign || null,
    });
  } catch (error) {
    console.error("Error fetching active campaign:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

// List all campaigns for admin
export const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate("courseId", "courseTitle").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, campaigns });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};
