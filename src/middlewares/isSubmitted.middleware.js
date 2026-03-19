import Assessment from "../Models/Assessment.model.js";
import Submission from "../Models/submission.model.js";

export const getResultsMiddleware = async (req, res, next) => {
  const { assessmentId } = req.params;
  const studentId = req.user._id;
  const { resubmission } = req.query;

  try {
    // Added .sort({ createdAt: -1 }) to bring the latest submissions first
    const submissions = await Submission.find({
      studentId,
      assessment: assessmentId,
    }).sort({ createdAt: -1 }); 

    if (!submissions || submissions.length === 0) {
      return next();
    }

    if (resubmission === "true") {
      return next();
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const questionMap = new Map();
    assessment.questions.forEach((q) => {
      questionMap.set(q._id.toString(), q);
    });

    const enrichedSubmissions = submissions.map((sub) => {
      const subObj = sub.toObject();
      return {
        ...subObj,
        answers: subObj.answers.map((answer) => ({
          ...answer,
          question: questionMap.get(answer.questionId.toString()),
        })),
      };
    });

    return res.status(200).json({
      message: "Submissions found",
      count: enrichedSubmissions.length,
      submissions: enrichedSubmissions,
      isAllowedResubmission: assessment.allowResubmission,
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Error fetching submissions", 
      error: err.message 
    });
  }
};
