import mongoose from "mongoose";
import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import CourseSch from "../../Models/courses.model.sch.js";
import User from "../../Models/user.model.js";
import Enrollment from "../../Models/Enrollement.model.js";
import Chapter from "../../Models/chapter.model.sch.js";
import Lesson from "../../Models/lesson.model.sch.js";
import Assessment from "../../Models/Assessment.model.js";
import AssessmentCategory from "../../Models/assessment-category.js";
import Announcement from "../../Models/Annoucement.model.js";
import Comment from "../../Models/comment.model.js";
import nodemailer from "nodemailer";


export const createCourseSch = async (req, res) => {
  const createdby = req.user._id;
  const {
    courseTitle,
    category,
    subcategory,
    language,
    courseDescription,
    semesterbased,
    teachingPoints,
    requirements,
    published,
    price,
    // courseType,
  } = req.body;

  const files = req.files;

  try {
    // ✅ Upload thumbnail
    let thumbnail = { url: "", filename: "" };
    if (files.thumbnail && files.thumbnail[0]) {
      const uploadResult = await uploadToCloudinary(
        files.thumbnail[0].buffer,
        "course_thumbnails"
      );
      thumbnail = {
        url: uploadResult.secure_url,
        filename: files.thumbnail[0].originalname,
      };
    }

    // ✅ Parse JSON fields
    const parsedTeachingPoints = JSON.parse(teachingPoints);
    const parsedRequirements = JSON.parse(requirements);

    // ✅ Create course
    const course = await CourseSch.create({
      courseTitle,
      category,
      subcategory,
      thumbnail,
      language,
      courseDescription,
      semesterbased,
      teachingPoints: parsedTeachingPoints,
      requirements: parsedRequirements,
      createdby,
      price,
      published,
      price,
      // courseType,
      // documents,
    });

    res.status(201).json({ course, message: "Course created successfully" });
  } catch (error) {
    console.log("error in createCourseSch", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllCoursesSch = async (req, res) => {
  const { isVerified, search } = req.query;

  const query = {
    isVerified: isVerified,
  };

  if (search) {
    query["courseTitle"] = { $regex: search, $options: "i" }; // Case-insensitive
  }

  try {
    const courses = await CourseSch.find(query)
      .populate(
        "createdby",
        "firstName middleName lastName Bio email profileImg"
      ) // only include necessary fields
      .populate("category", "title") // populate category name only
      .populate("subcategory", "title"); // if you want to include subcategory too

    if (!courses || courses.length === 0) {
      return res.status(200).json({ courses: [], message: "No courses found" });
    }

    res
      .status(200)
      .json({ courses, message: "All courses fetched successfully" });
  } catch (error) {
    console.error("Error fetching all courses:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getCoursesbySubcategorySch = async (req, res) => {
  const { search } = req.query;
  const { subCategoryId } = req.params;

  try {
    const query = {
      subcategory: subCategoryId,
      isVerified: "approved",
      published: true,
    };

    if (search) {
      query.courseTitle = { $regex: search, $options: "i" };
    }

    const courses = await CourseSch.find(query, {
      courseTitle: 1,
      thumbnail: 1,
      category: 1,
      subcategory: 1,
      createdby: 1,
      language: 1,
    })
      .populate("createdby", "firstName lastName Bio profileImg isVarified")
      .populate("category", "title")
      .populate("subcategory", "title");

    // Filter courses by verified teachers only
    const filteredCourses = courses.filter(
      (course) => course.createdby?.isVarified === true
    );

    if (filteredCourses.length === 0) {
      return res.status(200).json({ courses: [], message: "No courses found" });
    }

    res.status(200).json({
      courses: filteredCourses,
      message: "Courses fetched successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const courseDetailsStdPre = async (req, res) => {
  const { courseId } = req.params;  // Assuming you now pass a courseId instead of an enrollmentId

  try {
    const courseData = await Courseschema.aggregate([ // Assuming 'Courseschema' is the collection where courses are stored
      {
        $match: { _id: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdby",
          foreignField: "_id",
          as: "createdby",
        },
      },
      { $unwind: "$createdby" },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },
      {
        $lookup: {
          from: "semesters",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isArchived", false] },
                    { $eq: ["$course", "$$courseId"] },
                  ],
                },
              },
            },
          ],
          as: "semester",
        },
      },
      {
        $lookup: {
          from: "assessments",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$course", "$$courseId"] },
                    { $eq: ["$type", "final-assessment"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
              },
            },
          ],
          as: "finalAssessments",
        },
      },
      {
        $project: {
          courseTitle: 1,
          courseDescription: 1,
          language: 1,
          thumbnail: 1,
          createdAt: 1,
          updatedAt: 1,
          teachingPoints: 1,
          semester: 1,
          quarter: 1,
          requirements: 1,
          createdby: {
            _id: "$createdby._id",
            firstName: "$createdby.firstName",
            middleName: "$createdby.middleName",
            lastName: "$createdby.lastName",
            profileImg: "$createdby.profileImg",
          },
          category: {
            _id: "$category._id",
            title: "$category.title",
          },
          subcategory: {
            _id: "$subcategory._id",
            title: "$subcategory.title",
          },
          chapters: 1,
          finalAssessments: 1,
        },
      },
    ]);

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({
      message: "Course details fetched successfully",
      course: courseData[0],
    });
  } catch (error) {
    console.error("Error in courseDetails:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const getunPurchasedCourseByIdStdPrew = async (req, res) => {
  try {
    const courseId = req.params.id;

    const courseData = await CourseSch.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
          pipeline: [
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Get semester by matching courseId in semester's courses array
      {
        $lookup: {
          from: "semesters",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isArchived", false] },
                    { $eq: ["$course", "$$courseId"] },
                  ],
                },
              },
            },
          ],
          as: "semester",
        },
      },
      {
        $lookup: {
          from: "assessments",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$course", "$$courseId"] },
                    { $eq: ["$type", "Course-assessment"] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "assessmentcategories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "CourseAssessments",
        },
      },
      {
        $lookup: {
          from: "enrollments",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$course", "$$courseId"],
                },
              },
            },
          ],
          as: "enrollments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdby",
          foreignField: "_id",
          as: "createdby",
          pipeline: [
            {
              $project: {
                firstName: 1,
                middleName: 1,
                lastName: 1,
                profileImg: 1,
                isVarified: 1,
                email: 1,
              },
            },
          ]
        }
      },
      {
        $unwind: {
          path: "$createdby",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    console.log(courseData , "courseData")

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json({
      course: courseData[0],
      message: "Course fetched successfully",
    });
  } catch (error) {
    console.error("Error in getunPurchasedCourseByIdSch:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getunPurchasedCourseByIdSch = async (req, res) => {
  try {
    const courseId = req.params.id;

    const courseData = await CourseSch.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: "chapters",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$course", "$$courseId"] },
              },
            },
            {
              $lookup: {
                from: "lessons",
                let: { chapterId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$chapter", "$$chapterId"] },
                    },
                  },
                  {
                    $project: {
                      title: 1,
                      description: 1,
                      chapter: 1,
                    },
                  },
                ],
                as: "lessons",
              },
            },
            {
              $project: {
                title: 1,
                description: 1,
                lessons: 1,
              },
            },
          ],
          as: "chapters",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdby",
          foreignField: "_id",
          as: "createdby",
        },
      },
      { $unwind: { path: "$createdby", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseTitle: 1,
          thumbnail: 1,
          category: 1,
          subcategory: 1,
          createdby: {
            firstName: 1,
            middleName: 1,
            lastName: 1,
            Bio: 1,
            profileImg: 1,
          },
          language: 1,
          courseDescription: 1,
          teachingPoints: 1,
          requirements: 1,
          chapters: 1,
          price: 1,
        },
      },
    ]);

    if (!courseData || courseData.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res
      .status(200)
      .json({ course: courseData[0], message: "Course fetched successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getCourseDetails = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await CourseSch.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(courseId) },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
          pipeline: [
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Get semester by matching courseId in semester's courses array
      {
        $lookup: {
          from: "semesters",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isArchived", false] },
                    { $eq: ["$course", "$$courseId"] },
                  ],
                },
              },
            },
          ],
          as: "semester",
        },
      },
      {
        $lookup: {
          from: "assessments",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$course", "$$courseId"] },
                    { $eq: ["$type", "Course-assessment"] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "assessmentcategories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "CourseAssessments",
        },
      },
      {
        $lookup: {
          from: "enrollments",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$course", "$$courseId"],
                },
              },
            },
          ],
          as: "enrollments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdby",
          foreignField: "_id",
          as: "createdby",
          pipeline: [
            {
              $project: {
                firstName: 1,
                middleName: 1,
                lastName: 1,
                profileImg: 1,
                isVarified: 1,
                email: 1,
              },
            },
          ]
        }
      },
      {
        $unwind: {
          path: "$createdby",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    if (!course || course.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({
      message: "Course fetched successfully",
      course: course[0],
    });
  } catch (error) {
    console.error("error in getCourseHierarchy", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
export const deleteCourseSch = async (req, res) => {
  const { courseId } = req.params;

  try {
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // Delete the course
    const deletedCourse = await CourseSch.findByIdAndDelete(courseObjectId);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete all comments related to the course
    await Comment.deleteMany({ course: courseObjectId });

    // Delete related chapters
    const chapters = await Chapter.find({ course: courseObjectId });
    const chapterIds = chapters.map((ch) => ch._id);

    // Delete related lessons
    const lessons = await Lesson.find({ chapter: { $in: chapterIds } });
    const lessonIds = lessons.map((ls) => ls._id);

    // Delete all related chapters and lessons
    await Chapter.deleteMany({ _id: { $in: chapterIds } });
    await Lesson.deleteMany({ _id: { $in: lessonIds } });

    // Delete assessments related to the course, chapters, and lessons
    await Assessment.deleteMany({
      $or: [
        { course: courseObjectId, type: "final-assessment" },
        { chapter: { $in: chapterIds }, type: "chapter-assessment" },
        { lesson: { $in: lessonIds }, type: "lesson-assessment" },
      ],
    });

    // Delete announcements related to the course
    await Announcement.deleteMany({ course: courseObjectId });

    // Delete assessment categories related to the course
    await AssessmentCategory.deleteMany({
      course: courseObjectId,
    });

    // Delete enrollments related to the course
    await Enrollment.deleteMany({ course: courseObjectId });

    res.status(200).json({
      message:
        "Course and all related data, including comments, deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course and related data:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getCoursesByTeacherSch = async (req, res) => {
  const teacherId = req.user._id;
  const search = req.query.search?.trim();
  const published = req.query.published; // "true", "false", or undefined
  const verified = req.query.isVerified; // "true", "false", or undefined

  console.log(published, "published");
  console.log(verified, "verified");

  try {
    // Construct filter based on teacherId
    const query = {
      createdby: teacherId,
      isVerified: verified,
    };

    // Add search filter if provided
    if (search) {
      query["courseTitle"] = { $regex: search, $options: "i" }; // Case-insensitive
    }

    // Add published filter only if it's explicitly provided
    if (published !== undefined) {
      query["published"] = published === "true"; // Convert to boolean
    }

    // Find courses with filters
    const courses = await CourseSch.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "createdby",
        select: "firstName middleName lastName profileImg",
      })
      .populate({
        path: "category",
        select: "title",
      });

    if (!courses || courses.length === 0) {
      return res
        .status(200)
        .json({ courses: [], message: "No courses found for this teacher" });
    }

    res.status(200).json({ courses, message: "Courses fetched successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoursesforadminofteacher = async (req, res) => {
  const teacherId = req.query.teacherId;
  const { search } = req.query;

  console.log(teacherId, "teacherId");

  try {
    const query = {
      $and: [
        { createdby: teacherId },
        search
          ? { "basics.courseTitle": { $regex: search, $options: "i" } }
          : {},
      ],
    };

    const courses = await CourseSch.find(query)
      .populate("createdby")
      .populate("category");

    if (!courses || courses.length === 0) {
      return res
        .status(200)
        .json({ courses: [], message: "No courses found for this teacher" });
    }

    res.status(200).json({ courses, message: "Courses fetched successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getallcoursesforteacher = async (req, res) => {
  const teacherId = req.user._id;

  try {
    const studentsWithCourses = await Enrollment.aggregate([
      // 1. Lookup course details
      {
        $lookup: {
          from: "coursesches",
          localField: "course",
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      { $unwind: "$courseDetails" },
      // 2. Match only courses that are created by teacher and isVerified: "approved"
      {
        $match: {
          "courseDetails.createdby": teacherId,
          "courseDetails.isVerified": "approved",
        },
      },
      // 3. Lookup student details
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      { $unwind: "$studentDetails" },
      // 4. Group by student
      {
        $group: {
          _id: "$studentDetails._id",
          firstName: { $first: "$studentDetails.firstName" },
          middleName: { $first: "$studentDetails.middleName" },
          lastName: { $first: "$studentDetails.lastName" },
          Bio: { $first: "$studentDetails.Bio" },
          profileImg: { $first: "$studentDetails.profileImg" },
          gender: { $first: "$studentDetails.gender" },
          email: { $first: "$studentDetails.email" },
          createdAt: { $first: "$studentDetails.createdAt" },
          courses: {
            $push: {
              _id: "$courseDetails._id",
              courseTitle: "$courseDetails.courseTitle",
              description: "$courseDetails.courseDescription",
              thumbnail: "$courseDetails.thumbnail",
              category: "$courseDetails.category",
              subcategory: "$courseDetails.subcategory",
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      students: studentsWithCourses,
      message:
        "Students with their teacher's approved courses fetched successfully",
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getDueDate = async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await CourseSch.findById(courseId).select(
      "startingDate endingDate"
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({
      startingDate: course.startingDate,
      endingDate: course.endingDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const thumnailChange = async (req, res) => {
  const { courseId } = req.params;
  const thumbnail = req.file;

  try {
    const course = await CourseSch.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (thumbnail) {
      const result = await uploadToCloudinary(
        thumbnail.buffer,
        "course_thumbnails"
      );
      course.thumbnail = {
        url: result.secure_url,
        publicId: result.public_id,
        filename: thumbnail.originalname, // use original filename as alt text
      };

      course.save();
    }
    res.status(200).json({ message: "Thumbnail updated successfully" });
  } catch (error) {
    console.log("error in thumnail change", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCourseBasics = async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await CourseSch.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // console.log(course, "course");

    res.status(200).json({
      message: "Course found successfully",
      course,
    });
  } catch (error) {
    console.log("error in getting course basics", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editCourseInfo = async (req, res) => {
  const { courseId } = req.params;
  const {
    courseTitle,
    price,
    category,
    subcategory,
    language,
    teachingPoints,
    requirements,
    courseDescription,
  } = req.body;

  try {
    const course = await CourseSch.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const parsedTeachingPoints = JSON.parse(teachingPoints);
    const parsedRequirements = JSON.parse(requirements);

    course.courseTitle = courseTitle;
    course.category = category;
    course.price = price;
    course.subcategory = subcategory;
    course.language = language;
    course.teachingPoints = parsedTeachingPoints;
    course.requirements = parsedRequirements;
    course.courseDescription = courseDescription;

    course.save();

    res.status(200).json({ message: "Course updated successfully" });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyCourse = async (req, res) => {
  const { isVerified } = req.body;
  const { courseId } = req.params;

  if (!["approved", "rejected", "pending"].includes(isVerified)) {
    return res.status(400).json({
      message: "Invalid verification status. Must be 'approved', 'rejected', or 'pending'.",
    });
  }

  try {
    const course = await CourseSch.findById(
      courseId,
    ).populate("createdby");

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    console.log(isVerified, "isVerified")

    course.isVerified = isVerified;
    course.isAppliedReverified = {
      status: false,
      request: null,
    };

    console.log(course, "course");

    await course.save();

    const teacherEmail = course.createdby?.email;
    const teacherName = course.createdby?.firstName || "Instructor";
    const courseTitle = course.courseTitle;

    // ✅ Email setup (like in verifyTeacherDocument)
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // ✅ Send approval email
    if (isVerified === "approved" && teacherEmail) {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: teacherEmail,
          subject: "Course Approved ✅",
          html: `
            <h2>Congratulations, ${teacherName}!</h2>
            <p>Your course titled <strong>"${courseTitle}"</strong> has been <strong>approved</strong> by our review team.</p>
            <p>It is now live and visible to learners on the platform.</p>
            <br/>
            <p>We wish you great success in your teaching journey!</p>
            <p>Best regards,<br/>Team LMS</p>
          `,
        });
      } catch (mailError) {
        console.error("Error sending approval email:", mailError);
      }
    }

    // ✅ Send rejection email
    if (isVerified === "rejected" && teacherEmail) {
      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: teacherEmail,
          subject: "Course Rejected ❌",
          html: `
            <h2>Hello, ${teacherName}</h2>
            <p>We regret to inform you that your course titled <strong>"${courseTitle}"</strong> has been <strong>rejected</strong> after our review process.</p>
            <p>Please review the course guidelines and make the necessary changes before resubmitting.</p>
            <br/>
            <p>If you have questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br/>Team LMS</p>
          `,
        });
      } catch (mailError) {
        console.error("Error sending rejection email:", mailError);
      }
    }

    const message =
      isVerified === "approved"
        ? "Course approved successfully."
        : isVerified === "rejected"
          ? "Course rejected successfully."
          : "Course verification status updated.";

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Error verifying course:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};


export const rejectCourse = async (req, res) => {
  const { courseId } = req.params;
  const { remark } = req.body;

  try {
    const course = await CourseSch.findByIdAndUpdate(
      courseId,
      { isVerified: "rejected", remarks: remark },
      { new: true }
    ).populate("createdby");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.isAppliedReverified = {
      status: false,
      request: null,
    };

    await course.save();

    const teacherEmail = course.createdby?.email;
    const teacherName = course.createdby?.firstName || "Instructor";
    const courseTitle = course.courseTitle;

    // Send rejection email
    if (teacherEmail) {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      try {
        await transporter.sendMail({
          from: `"Admin Team" <${process.env.MAIL_USER}>`,
          to: teacherEmail,
          subject: "Your Course Has Been Rejected ❌",
          html: `
            <h2>Hello, ${teacherName}</h2>
            <p>Your course titled <strong>"${courseTitle}"</strong> has been <strong>rejected</strong> after review.</p>
            ${remark
              ? `<p><strong>Reason:</strong> ${remark}</p>`
              : "<p>No specific remarks were provided.</p>"
            }
            <p>You may revise and resubmit your course after making the required changes.</p>
            <br/>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br/>Team LMS</p>
          `,
        });
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }
    }

    res.status(200).json({ message: "Course rejected successfully" });
  } catch (error) {
    console.error("Error rejecting course:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const applyCourseReverification = async (req, res) => {
  const { courseId } = req.params;
  const { request } = req.body;

  try {
    const course = await CourseSch.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.isAppliedReverified = {
      status: true,
      request: request || null,
    };

    course.isVerified = "pending";

    await course.save();

    res.status(200).json({
      message: "Course re-verification request applied successfully",
      isAppliedReverified: course.isAppliedReverified,
    });
  } catch (error) {
    console.error("Error applying course re-verification:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const teacherCourseForDesboard = async (req, res) => {
  const teacherId = req.user._id;

  try {
    // Count published courses
    // Get the 5 most recently created published courses
    const recentPublishedCourses = await CourseSch.find({
      createdby: teacherId,
      published: true,
      isVerified: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("courseTitle thumbnail category courseDescription createdAt");

    const publishedCount = await CourseSch.countDocuments({
      createdby: teacherId,
      isVerified: "approved",
    });

    // Count unpublished courses
    const unpublishedCount = await CourseSch.countDocuments({
      createdby: teacherId,
      published: false,
    });

    const approvedCount = await CourseSch.countDocuments({
      createdby: teacherId,
      isVerified: "approved",
    });

    const pendingCount = await CourseSch.countDocuments({
      createdby: teacherId,
      isVerified: "pending",
    });
    const rejectedCount = await CourseSch.countDocuments({
      createdby: teacherId,
      isVerified: "rejected",
    });

    // Count total courses
    const totalCount = await CourseSch.countDocuments({
      createdby: teacherId,
    });

    res.status(200).json({
      published: recentPublishedCourses,
      unpublished: unpublishedCount,
      publishedCount: publishedCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      total: totalCount,
      message: "Course counts fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching teacher's course counts:", error);
    res.status(500).json({ error: error.message });
  }
};

export const archivedCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    // Fetch the course first
    const course = await CourseSch.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.published = !course.published;
    course.archivedDate = new Date();
    await course.save();

    res.status(200).json({
      message: "Course updated successfully",
      published: course.published,
      archivedDate: course.archivedDate,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///for teacher only
export const getVerifiedCourses = async (req, res) => {
  const teacherId = req.user._id;
  try {
    const courses = await CourseSch.find({
      createdby: teacherId,
      published: true,
      isVerified: "approved",
    }).select("courseTitle");

    if (!courses || courses.length === 0) {
      return res.status(200).json({ courses: [], message: "No courses found" });
    }

    res.status(200).json({ courses, message: "Courses fetched successfully" });
  } catch (error) {
    console.error("Error fetching courses for announcement:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getCoursesforAdmin = async (req, res) => {
  try {
    // Count published courses
    // Get the 5 most recently created published courses
    const recentPublishedCourses = await CourseSch.find({
      published: true,
      isVerified: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("courseTitle thumbnail category courseDescription createdAt");

    const publishedCount = await CourseSch.countDocuments({
      isVerified: "approved",
    });

    // Count unpublished courses
    const unpublishedCount = await CourseSch.countDocuments({
      published: false,
    });

    const approvedCount = await CourseSch.countDocuments({
      isVerified: "approved",
    });

    const pendingCount = await CourseSch.countDocuments({
      isVerified: "pending",
    });
    const rejectedCount = await CourseSch.countDocuments({
      isVerified: "rejected",
    });

    // Count total courses
    const totalCount = await CourseSch.countDocuments({});

    res.status(200).json({
      published: recentPublishedCourses,
      unpublished: unpublishedCount,
      publishedCount: publishedCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      total: totalCount,
      message: "Course counts fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching admin's course counts:", error);
    res.status(500).json({ error: error.message });
  }
};


export const getRequiredDocumentforEdit = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await CourseSch.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const { documents, courseType } = course;
    res.status(200).json({
      documents,
      courseType,
      message: "Required documents fetched successfully",
    });

  } catch (error) {
    console.log("Error in getRequiredDocumentforEdit", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const editCoureDocument = async (req, res) => {
  const { courseId } = req.params;
  const files = req.files;

  try {
    const course = await CourseSch.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Get the current full documents object from DB
    const currentDocuments = course.documents || {};
    const updatedDocuments = { ...currentDocuments };

    for (const field in files) {
      const file = files[field]?.[0];
      if (file) {
        // Optional: delete old file from cloudinary
        if (updatedDocuments[field]?.publicId) {
          // await deleteFromCloudinary(updatedDocuments[field].publicId);
        }

        const uploadResult = await uploadToCloudinary(file.buffer, "course_documents");

        updatedDocuments[field] = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          filename: file.originalname,
        };
      }
    }

    if (updatedDocuments.resume) {
      course.documents.resume = updatedDocuments.resume;
    }
    if (updatedDocuments.certificate) {
      course.documents.certificate = updatedDocuments.certificate;
    }
    if (updatedDocuments.governmentId) {
      course.documents.governmentId = updatedDocuments.governmentId;
    }
    if (updatedDocuments.transcript) {
      course.documents.transcript = updatedDocuments.transcript;
    }

    await course.save();
    res.status(200).json({ message: "Course documents updated successfully" });
  } catch (error) {
    console.error("Error in editCoureDocument", error.message);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};