import mongoose from "mongoose";
import Chapter from "../../Models/chapter.model.sch.js";
import Quarter from "../../Models/quarter.model.js";
import Course from "../../Models/courses.model.sch.js";
import { notifyNewChapter } from "../../Utiles/notificationService.js";

export const createChapter = async (req, res) => {
  const course = req.params.courseId;
  const createdby = req.user._id;
  const { title, description, quarter } = req.body;

  try {
    const chapterObject = {
      title,
      description,
      course,
      createdby,
    };

    if (mongoose.Types.ObjectId.isValid(quarter)) {
      chapterObject.quarter = quarter;
    }

    const chapter = await Chapter.create(chapterObject);
    
    // Send new chapter notification to enrolled students
    const courseData = await Course.findById(course).select("courseTitle");
    if (courseData) {
      await notifyNewChapter(course, courseData.courseTitle, title, chapter._id, createdby);
    }
    
    res.status(201).json({ message: "Chapter created successfully", chapter });
  } catch (error) {
    console.log("error in creating chapter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChapterofCourse = async (req, res) => {
  const { quarterId } = req.params;
  try {
    const chapters = await Chapter.find({ quarter: quarterId });
    if (!chapters)
      return res
        .status(404)
        .json({ message: "No chapters found for this course" });

    res.status(200).json({
      message: "Chapter found successfully",
      count: chapters.length,
      chapters,
    });
  } catch (error) {
    console.log("error in getting chapters", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteChapter = async (req, res) => {
  const { chapterId } = req.params;
  console.log(chapterId, "chapterId");
  try {
    const chapters = await Chapter.findOneAndDelete({ _id: chapterId });
    if (!chapters)
      return res
        .status(404)
        .json({ message: "No chapters found for this course" });

    res.status(200).json({
      message: "Chapter deleted successfully",
      chapters,
    });
  } catch (error) {
    console.log("error in getting chapters", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChapterwithLessons = async (req, res) => {
  const { chapterId } = req.params;
  try {
    const chapters = await Chapter.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(chapterId),
        },
      },

      { $sort: { createdAt: 1 } },

      // Lookup Quarter
      {
        $lookup: {
          from: "quarters",
          localField: "quarter",
          foreignField: "_id",
          as: "quarter",
        },
      },
      {
        $unwind: {
          path: "$quarter",
          preserveNullAndEmptyArrays: true, // ✅ allow chapters without quarter
        },
      },

      // Lookup Semester via Quarter
      {
        $lookup: {
          from: "semesters",
          localField: "quarter.semester",
          foreignField: "_id",
          as: "semester",
        },
      },
      {
        $unwind: {
          path: "$semester",
          preserveNullAndEmptyArrays: true, // ✅ allow chapters without semester
        },
      },

      // Lookup Lessons with Assessments
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "chapter",
          as: "lessons",
          pipeline: [
            {
              $lookup: {
                from: "assessments",
                let: { lessonId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$lesson", "$$lessonId"] },
                          { $eq: ["$type", "lesson-assessment"] },
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
                as: "lesson_assessments",
              },
            },
          ],
        },
      },

      // Lookup Chapter Assessments
      {
        $lookup: {
          from: "assessments",
          let: { chapterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chapter", "$$chapterId"] },
                    { $eq: ["$type", "chapter-assessment"] },
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
          as: "chapter_assessments",
        },
      },
    ]);

    if (!chapters || chapters.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    res.status(200).json({
      message: "Chapter found successfully",
      chapter: chapters[0],
    });
  } catch (error) {
    console.error("error in getting chapters with lessons", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getChapterOfQuarter = async (req, res) => {
  const { courseId, quarterId } = req.params;
  try {
    const quarter = await Quarter.findById(quarterId);

    const chapters = await Chapter.aggregate([
      {
        $match: {
          quarter: new mongoose.Types.ObjectId(quarterId),
          course: new mongoose.Types.ObjectId(courseId),
        },
      },

      { $sort: { createdAt: 1 } },

      // Lookup Quarter
      {
        $lookup: {
          from: "quarters",
          localField: "quarter",
          foreignField: "_id",
          as: "quarter",
        },
      },
      { $unwind: "$quarter" },

      // Lookup Semester via Quarter
      {
        $lookup: {
          from: "semesters",
          localField: "quarter.semester",
          foreignField: "_id",
          as: "semester",
        },
      },
      { $unwind: "$semester" },

      // Optional: Lookup Lessons and Assessments (if needed)
      {
        $lookup: {
          from: "lessons",

          localField: "_id",
          foreignField: "chapter",
          as: "lessons",
          pipeline: [
            {
              $lookup: {
                from: "assessments",
                let: { lessonId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$lesson", "$$lessonId"] },
                          { $eq: ["$type", "lesson-assessment"] },
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
                as: "lesson_assessments",
              },
            },
          ],
        },
      },

      {
        $lookup: {
          from: "assessments",

          let: { chapterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chapter", "$$chapterId"] },
                    { $eq: ["$type", "chapter-assessment"] },
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
          as: "chapter_assessments",
        },
      },
    ]);

    if (!chapters || chapters.length === 0) {
      return res
        .status(404)
        .json({ message: "No chapters found for this quarter" });
    }

    res.status(200).json({
      message: "Chapter found successfully",
      count: chapters.length,
      quarterStartDate: quarter.startDate,
      quarterEndDate: quarter.endDate,
      chapters,
    });
  } catch (error) {
    console.error("error in getting chapters of Quarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const ChapterofCourse = async (req, res) => {

  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid courseId" });
    }
    const chapters = await Chapter.find({ course: courseId });

    console.log(chapters, "chapters")

    res.status(200).json({ message: "Chapter found successfully", chapters });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
export const editChapter = async (req, res) => {
  const { chapterId } = req.params;
  const { title, description } = req.body;
  try {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    chapter.title = title;
    chapter.description = description;
    chapter.save();

    res.status(200).json({ message: "Chapter updated successfully" });
  } catch (error) {
    console.log("Error in the Edit Chapter", error);
    res.status(500).json({ message: "Somehthing went wrong" });
  }
};