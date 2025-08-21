import Enrollment from "../Models/Enrollement.model.js";

export const isEnrolledMiddleware = async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  try {
    const exists = await Enrollment.findOne({
      student: userId,
      course: courseId,
    });
    if (!exists) {
      return res
        .status(404)
        .json({ message: "You are not enrolled in this course" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
