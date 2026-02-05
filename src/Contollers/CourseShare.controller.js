import CourseShare from "../Models/CourseShare.model.js";
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

// Admin endpoint for analytics
export const getShareAnalytics = async (req, res) => {
  try {
    const { courseId } = req.query; // Changed from params to query for flexibility

    const query = courseId ? { courseId } : {};

    const totalShares = await CourseShare.countDocuments(query);

    const breakdown = await CourseShare.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            ref: "$ref",
            utm_source: "$utm_source",
            utm_medium: "$utm_medium",
            utm_campaign: "$utm_campaign",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          ref: "$_id.ref",
          utm_source: "$_id.utm_source",
          utm_medium: "$_id.utm_medium",
          utm_campaign: "$_id.utm_campaign",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      totalShares,
      breakdown,
    });
  } catch (error) {
    console.error("Error fetching share analytics:", error);
    return res
      .status(500)
      .json({ error: true, message: "Failed to fetch analytics" });
  }
};
