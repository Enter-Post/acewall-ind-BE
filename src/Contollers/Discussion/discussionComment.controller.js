import Discussion from "../../Models/discussion.model.js";
import DiscussionComment from "../../Models/discussionComment.model.js";

export const getDiscussionComments = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 5 } = req.query; // Default to page 1, 5 comments per page

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const discussionComments = await DiscussionComment.find({
      discussion: id,
    })
      .populate("createdby", "profileImg firstName middleName lastName role")
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit));

    const totalComments = await DiscussionComment.countDocuments({
      discussion: id,
    });

    res.status(200).json({
      message: "Comments fetched successfully",
      discussionComments,
      totalPages: Math.ceil(totalComments / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.log("Error in fetching discussion comments", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendDiscussionComment = async (req, res) => {
  const user = req.user;
  const { text } = req.body;
  const { id } = req.params;

  try {
    const isCommented = await DiscussionComment.findOne({
      createdby: user._id,
      discussion: id,
    });

    if (user.role !== "teacher" && isCommented) {
      return res.status(400).json({ message: "You have already commented on this discussion" });
    }

    const newDiscussionComment = new DiscussionComment({
      text,
      role: user.role,
      createdby: user._id,
      discussion: id,
    });
    await newDiscussionComment.save();
    res.status(200).json({
      message: "Comment sent successfully",
      newDiscussionComment,
    });
  } catch (error) {
    console.log("error in the discussion comment", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    const Comment = await DiscussionComment.findByIdAndDelete(id);

    if (!Comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.log("error in deleting comment", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const gradeDiscussionofStd = async (req, res) => {
  const { discID, discussionCommentId } = req.params;
  const { obtainedMarks } = req.body;

  try {
    const discussion = await Discussion.findById(discID);
    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found" });
    }

    const discussionComment = await DiscussionComment.findById(discussionCommentId);
    if (!discussionComment) {
      return res.status(404).json({ message: "Discussion comment not found" });
    }

    // Step 1: Get the student who made the comment
    const studentId = discussionComment.createdby;

    // Step 2: Check if any of this student's comments in this discussion are already graded
    const alreadyGraded = await DiscussionComment.findOne({
      discussion: discID,
      createdby: studentId,
      isGraded: true,
    });

    if (alreadyGraded) {
      return res.status(400).json({
        message: "This student has already been graded for this discussion.",
      });
    }

    // Step 3: Grade the comment
    discussionComment.gradedBy = req.user._id;
    discussionComment.marksObtained = obtainedMarks;
    discussionComment.isGraded = true;

    await discussionComment.save();

    res.status(200).json({ message: "Marks graded successfully" });
  } catch (error) {
    console.error("Error grading discussion comment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const isCommentedInDiscussion = async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  try {
    const isCommented = await DiscussionComment.findOne({
      createdby: user._id,
      discussion: id,
    });

    if (user.role !== "teacher" && isCommented) {
      return res.status(200).json({ commented: true });
    }
  } catch (error) {
    console.log("error in the discussion comment", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
