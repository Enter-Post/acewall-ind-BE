import Posts from "../../Models/PostModels/post.model.js";  
import Enrollment from "../../Models/Enrollement.model.js";
import CourseSch from "../../Models/courses.model.sch.js";

export const createPost = async (req, res) => {
    try {
        const { text, color, postType, courseId } = req.body;
        const assets = req.files || [];
        const author = req.user._id;

        const uploadedFiles = assets.map(asset => {
            let fileType = 'file';
            if (asset.mimetype.startsWith('video/')) fileType = 'videos';
            else if (asset.mimetype.startsWith('image/')) fileType = 'image';

            return {
                url: `${process.env.ASSET_URL}uploads/${fileType}/${asset.filename}`,
                fileName: asset.originalname,
                type: asset.mimetype
            };
        });

        const postData = {
            text,
            assets: uploadedFiles, // Now correctly structured as an array of objects
            author,
            color,
            postType: postType || "public"
        };

        // Only add course if postType is course AND courseId is a valid hex string
        if (postType === "course" && courseId && courseId.length === 24) {
            postData.course = courseId;
        }

        const post = new Posts(postData);
        await post.save();

        res.status(201).json({ message: 'Post created successfully', post });
    } catch (error) {
        console.error("SAVING ERROR:", error);
        res.status(500).json({ 
            message: 'Internal Server error', 
            details: error.message 
        });
    }
}
export const getPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 🎯 Get courseId from query params (e.g., /getPosts?courseId=123)
        const { courseId } = req.query;

        // 1️⃣ Find all courses this user is associated with
        let myCourseIds = [];
        if (userRole === "teacher" || userRole === "admin") {
            const ownedCourses = await CourseSch.find({ createdby: userId }).select("_id");
            myCourseIds = ownedCourses.map(c => c._id);
        } else {
            const enrollments = await Enrollment.find({ student: userId }).select("course");
            myCourseIds = enrollments.map(e => e.course);
        }

        // 2️⃣ Construct the Query
        let query = {};

        if (courseId && courseId !== "all") {
            // Check if the user has permission to see this specific course
            const hasAccess = myCourseIds.some(id => id.toString() === courseId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied to this course feed" });
            }
            query = { postType: "course", course: courseId };
        } else {
            // Default: Show all Public posts OR Course posts from user's joined courses
            query = {
                $or: [
                    { postType: "public" },
                    { postType: "course", course: { $in: myCourseIds } }
                ]
            };
        }

        // 3️⃣ Execute Query
        const totalPosts = await Posts.countDocuments(query);
        const posts = await Posts.find(query)
            .populate('author', '_id firstName middleName lastName profileImg')
            // Populate course info so we can show course code/title on the PostCard
            .populate('course', 'courseTitle courseCode') 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalPosts / limit);

        res.json({
            currentPage: page,
            totalPages,
            totalPosts,
            limit,
            posts,
        });

    } catch (error) {
        console.error("Error in getPosts:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const specificUserPosts = async (req, res) => {
    const userId = req.params.id;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const totalPosts = await Posts.countDocuments({ author: userId });

        const posts = await Posts.find({ author: userId })
            .populate('author', 'firstName middleName lastName profileImg')
            .sort({ createdAt: -1 }) // newest first
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalPosts / limit);

        res.json({
            currentPage: page,
            totalPages,
            totalPosts,
            limit,
            posts,
        });
    } catch (error) {
        console.log("Error in specificUserPosts", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deletePost = async (req, res) => {
  const { postId } = req.params; // ✅ get from params

  try {
    const post = await Posts.findByIdAndDelete(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};