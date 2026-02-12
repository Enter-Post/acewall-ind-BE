import Enrollment from "../Models/Enrollement.model.js";

export const isEnrolledMiddleware = async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  try {
    let enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
    });
    
    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "You are not enrolled in this course" });
    }

    console.log("=== ENROLLMENT CHECK ===");
    console.log("Status:", enrollment.status);
    console.log("Cancellation Date:", enrollment.cancellationDate);
    console.log("Current Date:", new Date());
    console.log("Date passed?", new Date() >= enrollment.cancellationDate);

    // Auto-update APPLIEDFORCANCEL to CANCELLED if cancellation date has passed
    if (enrollment.status === "APPLIEDFORCANCEL" && enrollment.cancellationDate) {
      const now = new Date();
      if (now >= enrollment.cancellationDate) {
        console.log("🔄 Auto-updating status to CANCELLED");
        enrollment.status = "CANCELLED";
        await enrollment.save();
        console.log("✅ Status updated successfully");
      }
    }

    console.log("Final Status:", enrollment.status);

    // Check if enrollment status allows access
    const activeStatuses = ["ACTIVE", "TRIAL", "APPLIEDFORCANCEL", "PAST_DUE"];
    
    if (!activeStatuses.includes(enrollment.status)) {
      // Status is CANCELLED - access denied but can renew
      const canRenew = enrollment.enrollmentType === "SUBSCRIPTION" && 
                       enrollment.status === "CANCELLED";
      
      console.log("❌ ACCESS DENIED - Status:", enrollment.status);
      
      return res.status(403).json({ 
        message: "Your enrollment has been cancelled. Please renew your subscription to continue.",
        canRenew,
        enrollmentId: enrollment._id
      });
    }

    console.log("✅ ACCESS GRANTED");

    // Attach enrollment to request for potential use in controllers
    req.enrollment = enrollment;
    next();
  } catch (err) {
    console.error("Middleware error:", err);
    res.status(500).json({ error: err.message });
  }
};