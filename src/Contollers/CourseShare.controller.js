import CourseShare from "../Models/CourseShare.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Public endpoint to track share
export const trackShare = async (req, res) => {
  try {
    const { courseId, ref, utm_source, utm_medium, utm_campaign } = req.body;

    if (!courseId) {
      return res
        .status(400)
        .json({ error: true, message: "Course ID is required" });
    }

    let userId = null;

    // Manually check for token to make it optional
    const token = req.cookies?.ind_client_jwt || req.cookies?.ind_admin_jwt;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRAT);
        if (decoded && decoded.user) {
          userId = decoded.user._id;
        }
      } catch (err) {
        // Ignore invalid token for public tracking
      }
    }

    const shareData = {
      courseId,
      ref: ref || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      ipAddress:
        req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      userId,
    };

    // Tracking is non-blocking for course content, we can return response immediately if we wanted
    // but here we ensure it's saved.
    await CourseShare.create(shareData);

    return res
      .status(200)
      .json({ success: true, message: "Share tracked successfully" });
  } catch (error) {
    console.error("Error tracking course share:", error);
    // Lightweight: even if it fails, don't break the user experience
    return res
      .status(200)
      .json({ success: false, message: "Tracking failed silently" });
  }
};

// Admin endpoint for total shares by course with breakdown
export const getCourseShareAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { startDate, endDate, utm_source, utm_campaign } = req.query;

    if (!courseId) {
      return res
        .status(400)
        .json({ error: true, message: "Course ID is required" });
    }

    const matchQuery = { courseId: new mongoose.Types.ObjectId(courseId) };

    // Date filters
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // UTM filters
    if (utm_source) matchQuery.utm_source = utm_source;
    if (utm_campaign) matchQuery.utm_campaign = { $regex: utm_campaign, $options: "i" };

    // Fetch raw records for the detailed log table
    const analytics = await CourseShare.find(matchQuery)
      .populate("courseId", "courseTitle")
      .sort({ createdAt: -1 })
      .lean();

    const totalShares = analytics.length;

    // Source breakdown
    const sourceMap = {};
    const campaignMap = {};
    const timeMap = {};

    analytics.forEach((item) => {
      const source = item.utm_source || "direct";
      sourceMap[source] = (sourceMap[source] || 0) + 1;

      const campaign = item.utm_campaign || "none";
      campaignMap[campaign] = (campaignMap[campaign] || 0) + 1;

      const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
      timeMap[dateKey] = (timeMap[dateKey] || 0) + 1;
    });

    const summary = {
      totalShares,
      sourceBreakdown: Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      campaignBreakdown: Object.entries(campaignMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      timeSeriesData: Object.entries(timeMap).map(([date, shares]) => ({ date, shares })).sort((a, b) => new Date(a.date) - new Date(b.date)),
    };

    return res.status(200).json({
      success: true,
      courseId,
      totalShares,
      analytics,
      summary,
    });
  } catch (error) {
    console.error("Error fetching course share analytics:", error);
    return res
      .status(500)
      .json({ error: true, message: "Failed to fetch course analytics" });
  }
};

// Admin endpoint for global analytics across all courses
export const getGlobalShareAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, utm_source, utm_campaign } = req.query;

    const matchQuery = {};

    // Date filters
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // UTM filters
    if (utm_source) matchQuery.utm_source = utm_source;
    if (utm_campaign) matchQuery.utm_campaign = { $regex: utm_campaign, $options: "i" };

    // Fetch raw records for the detailed log table
    const analytics = await CourseShare.find(matchQuery)
      .populate("courseId", "courseTitle")
      .sort({ createdAt: -1 })
      .lean();

    const totalShares = analytics.length;

    // Build summary breakdowns
    const sourceMap = {};
    const campaignMap = {};
    const timeMap = {};

    analytics.forEach((item) => {
      const source = item.utm_source || "direct";
      sourceMap[source] = (sourceMap[source] || 0) + 1;

      const campaign = item.utm_campaign || "none";
      campaignMap[campaign] = (campaignMap[campaign] || 0) + 1;

      const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
      timeMap[dateKey] = (timeMap[dateKey] || 0) + 1;
    });

    const summary = {
      totalShares,
      sourceBreakdown: Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      campaignBreakdown: Object.entries(campaignMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      timeSeriesData: Object.entries(timeMap).map(([date, shares]) => ({ date, shares })).sort((a, b) => new Date(a.date) - new Date(b.date)),
    };

    return res.status(200).json({
      success: true,
      totalShares,
      analytics,
      summary,
    });
  } catch (error) {
    console.error("Error fetching global share analytics:", error);
    return res
      .status(500)
      .json({ error: true, message: "Failed to fetch global analytics" });
  }
};

// Backward compatibility or legacy support (can be removed later)
export const getShareAnalytics = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (courseId) {
      req.params.courseId = courseId;
      return getCourseShareAnalytics(req, res);
    }
    return getGlobalShareAnalytics(req, res);
  } catch (error) {
    console.error("Error in getShareAnalytics:", error);
    return res
      .status(500)
      .json({ error: true, message: "Failed to fetch analytics" });
  }
};
