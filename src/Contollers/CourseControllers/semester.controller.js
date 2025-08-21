import mongoose from "mongoose";
import CourseSch from "../../Models/courses.model.sch.js";
import Semester from "../../Models/semester.model.js";

export const createSemester = async (req, res) => {
  const createdby = req.user._id;
  const { courseId } = req.params;
  const { title, startDate, endDate } = req.body;
  try {
    const newSemester = new Semester({
      title,
      startDate,
      endDate,
      course: courseId,
      createdby,
    });
    await newSemester.save();
    res
      .status(201)
      .json({ message: "Semester created successfully", newSemester });
  } catch (error) {
    console.log("error in creating semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSemesterOfCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const semesters = await Semester.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
        },
      },
      {
        $lookup: {
          from: "quarters", // collection name in lowercase plural form
          localField: "_id",
          foreignField: "semester",
          as: "quarters",
        },
      },
    ]);

    res
      .status(200)
      .json({ message: "Semesters found successfully", semesters });
  } catch (error) {
    console.log("error in getting semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSemesterwithQuarter = async (req, res) => {
  try {
    const semesters = await Semester.aggregate([
      {
        $lookup: {
          from: "quarters", // collection name in lowercase plural form
          localField: "_id",
          foreignField: "semester",
          as: "quarters",
        },
      },
      {
        $sort: { startDate: 1 }, // Optional: sort semesters chronologically
      },
    ]);

    res
      .status(200)
      .json({ message: "Semesters found successfully", semesters });
  } catch (error) {
    console.error("Error fetching semesters with quarters:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const selectingNewSemesterwithQuarter = async (req, res) => {
  const { semester, quarter } = req.body;
  const { courseId } = req.params;

  try {
    const course = await CourseSch.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const semesterResults =
      Array.isArray(course.semester) && Array.isArray(semester)
        ? semester.map((s) => ({
          id: s,
          status: course.semester.map(String).includes(String(s)),
        }))
        : [];

    const quarterResults =
      Array.isArray(course.quarter) && Array.isArray(quarter)
        ? quarter.map((q) => ({
          id: q,
          status: course.quarter.map(String).includes(String(q)),
        }))
        : [];

    semesterResults.forEach((s) => {
      if (s.status === false) {
        course.semester.push(s.id);
      }
    });

    quarterResults.forEach((q) => {
      if (q.status === false) {
        course.quarter.push(q.id);
      }
    });

    await course.save(); // ✅ Now it persists to MongoDB

    return res.status(200).json({
      message: "Semester and Quarter updated successfully",
    });
  } catch (error) {
    console.log("error in SelectingNewSemesterwithQuarter", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const archivedSemester = async (req, res) => {
  const { isArchived } = req.body;
  const { semesterId } = req.params;
  try {
    const semesters = await Semester.findByIdAndUpdate(
      semesterId,
      {
        isArchived,
      },
      {
        new: true,
      }
    );
    res
      .status(200)
      .json({ message: "Semesters found successfully", semesters });
  } catch (error) {
    console.log("error in getting semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editSemester = async (req, res) => {
  const { semesterId } = req.params;
  const { title, startDate, endDate, course } = req.body;

  try {
    // Check for another semester in the same course with the same title (case-insensitive)
    const existingSemester = await Semester.findOne({
      _id: { $ne: semesterId }, // exclude the one being edited
      title: { $regex: new RegExp(`^${title}$`, "i") }, // case-insensitive match
      course: course
    });

    if (existingSemester) {
      return res.status(400).json({
        success: false,
        message: "Another semester with the same title already exists in this course."
      });
    }

    // Update semester
    const updatedSemester = await Semester.findByIdAndUpdate(
      semesterId,
      { title, startDate, endDate, course },
      { new: true }
    );

    if (!updatedSemester) {
      return res.status(404).json({ message: "Semester not found" });
    }

    res.status(200).json({
      message: "Semester updated successfully",
      updatedSemester
    });

  } catch (error) {
    console.log("error in editing semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getSemesterbyId = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const semesters = await Semester.findById(semesterId);
    if (!semesters) {
      return res.status(404).json({ message: "Semester not found" });
    }

    const alreadyExist = await Semester.findOne({ title: semesters.title, _id: { $ne: semesterId } });
    if (alreadyExist) {
      return res.status(400).json({ message: "Already exist with same title" });
    }

    res
      .status(200)
      .json({ message: "Semesters found successfully", semesters });

  } catch (error) {
    console.log("error in getting semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const deleteSemester = async (req, res) => {
  const { semesterId } = req.params;
  try {
    const semesters = await Semester.findByIdAndDelete(semesterId);
    res
      .status(200)
      .json({ message: "Semesters found successfully", semesters });
  } catch (error) {
    console.log("error in getting semester", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
