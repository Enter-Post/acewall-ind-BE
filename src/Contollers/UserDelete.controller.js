import mongoose from "mongoose";
import Enrollment from "../Models/Enrollement.model.js";
import Submission from "../Models/submission.model.js";
import Comment from "../Models/comment.model.js";
import DiscussionComment from "../Models/discussionComment.model.js";
import Gradebook from "../Models/Gradebook.model.js";
import Rating from "../Models/rating.model.js";
import CourseSch from "../Models/courses.model.sch.js";
import AIChat from "../Models/AIChat.model.js";
import AnnoucementModel from "../Models/Annoucement.model.js";
import AssessmentCategory from "../Models/assessment-category.js";
import Assessment from "../Models/Assessment.model.js";
import Chapter from "../Models/chapter.model.sch.js";
import Discussion from "../Models/discussion.model.js";
import GPA from "../Models/GPA.model.js";
import GradingScale from "../Models/grading-scale.model.js";
import Lesson from "../Models/lesson.model.sch.js";
import Pages from "../Models/Pages.modal.js";
import DiscussionReply from "../Models/replyDiscussion.model.js";
import Semester from "../Models/semester.model.js";
import StandardGrading from "../Models/StandardGrading.model.js";
import Posts from "../Models/PostModels/post.model.js";
import PostComments from "../Models/PostModels/postComment.model.js";
import PostLike from "../Models/PostModels/postLikes.model.js";
import Conversation from "../Models/conversation.model.js";
import User from "../Models/user.model.js";
import { NotFoundError, AuthenticationError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";


export const deleteUser = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const userId = req.user._id;

        if (!req.user) {
            throw new AuthenticationError("Unauthorized", "UDEL_001");
        }

        session.startTransaction();

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            throw new NotFoundError("User not found", "UDEL_002");
        }

        /** OPTIONAL: Delete profile image */
        if (user.profileImg?.publicId) {
            // await cloudinary.v2.uploader.destroy(user.profileImg.publicId);
        }

        /** 🔥 Parallel deletion of all user-related data */
        await Promise.all([
            // Original deletions
            Enrollment.deleteMany({ student: userId }).session(session),
            Submission.deleteMany({ studentId: userId }).session(session),
            Comment.deleteMany({ createdby: userId }).session(session),
            DiscussionComment.deleteMany({ createdby: userId }).session(session),
            Gradebook.deleteMany({ studentId: userId }).session(session),
            Rating.deleteMany({ createdby: userId }).session(session),

            // New model deletions
            CourseSch.deleteMany({ createdby: userId }).session(session),
            AIChat.deleteMany({ userId: userId }).session(session),
            AnnoucementModel.deleteMany({ teacher: userId }).session(session),
            AssessmentCategory.deleteMany({ createdBy: userId }).session(session),
            Assessment.deleteMany({ createdby: userId }).session(session),
            Chapter.deleteMany({ createdby: userId }).session(session),
            Discussion.deleteMany({ createdby: userId }).session(session),
            GPA.deleteMany({ createdby: userId }).session(session),
            GradingScale.deleteMany({ createdby: userId }).session(session),
            Lesson.deleteMany({ createdby: userId }).session(session),
            Pages.deleteMany({ createdBy: userId }).session(session),
            DiscussionReply.deleteMany({ createdby: userId }).session(session),
            Semester.deleteMany({ createdby: userId }).session(session),
            StandardGrading.deleteMany({ createdby: userId }).session(session),
            Posts.deleteMany({ author: userId }).session(session),
            PostComments.deleteMany({ author: userId }).session(session),
            PostLike.deleteMany({ likedBy: userId }).session(session),

            /** Remove user from conversations */
            Conversation.updateMany(
                { members: userId },
                {
                    $pull: { members: userId },
                    $unset: { [`lastSeen.${userId}`]: "" },
                }
            ).session(session),

            /** Delete empty conversations */
            Conversation.deleteMany({ members: { $size: 0 } }).session(session),
        ]);

        /** Finally delete user */
        await User.deleteOne({ _id: userId }).session(session);

        await session.commitTransaction();

        let host = "";
        const origin = req.get("origin");

        if (origin) {
            try {
                host = new URL(origin).hostname;
            } catch (err) {
                console.error("Invalid origin header:", origin);
            }
        }
        if (!host && req.hostname) {
            host = req.hostname;
        }

        const portal = host && host.startsWith("admin.") ? "admin" : "client";
        const cookieName = portal === "admin" ? "ind_admin_jwt" : "ind_client_jwt";

        // Clear the cookie
        res.clearCookie(cookieName, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/", // Must match original cookie path
        });

        return res.status(200).json({
            message: "User and all related data deleted successfully",
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});