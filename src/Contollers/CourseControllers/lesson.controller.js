import { uploadToCloudinary } from "../../lib/cloudinary-course.config.js";
import Lesson from "../../Models/lesson.model.sch.js";
import { v2 as cloudinary } from "cloudinary";


export const createLesson = async (req, res) => {
  const createdby = req.user._id;
  const { title, description, youtubeLinks, otherLink, chapter } = req.body;
  const pdfFiles = req.files;

  console.log(req.body.otherLink, "otherLink");

  try {
    let uploadedFiles = [];

    // Check if PDF files exist
    if (pdfFiles && pdfFiles.length > 0) {
      // Process each PDF file and upload to Cloudinary
      for (const file of pdfFiles) {
        const result = await uploadToCloudinary(file.buffer, "lesson_pdfs");

        uploadedFiles.push({
          url: result.secure_url,
          public_id: result.public_id,
          filename: file.originalname,
        });
      }
    }

    // Create new lesson with or without PDF files
    const newLesson = new Lesson({
      title,
      description,
      youtubeLinks,
      otherLink,
      pdfFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined, // If no PDF files, set as undefined
      chapter,
      createdby,
    });

    console.log(newLesson, "newLesson");

    await newLesson.save();

    res.status(201).json({ message: "Lesson created successfully", newLesson });
  } catch (error) {
    console.log("error in creating lesson", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteLesson = async (req, res) => {
  const { lessonId } = req.params;
  try {
    const lesson = await Lesson.findOneAndDelete({ _id: lessonId });
    if (!lesson)
      return res
        .status(404)
        .json({ message: "No lesson found for this course" });

    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.log("error in deleting lesson", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getLessons = async (req, res) => {
  const { chapterId } = req.params;
  try {
    const lessons = await Lesson.find({ chapter: chapterId });
    if (!lessons)
      return res
        .status(404)
        .json({ message: "No lesson found for this course" });

    res.status(200).json({ message: "Lessons found successfully", lessons });
  } catch (error) {
    console.log("error in getting lessons", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const editLesson = async (req, res) => {
  const { lessonId } = req.params;
  const { title, description, youtubeLinks, otherLink } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  try {
    const updatedLesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { title, description, youtubeLinks, otherLink },
      { new: true, runValidators: true }
    );

    if (!updatedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res
      .status(200)
      .json({ message: "Lesson edited successfully", lesson: updatedLesson });
  } catch (error) {
    console.error("Error editing lesson:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addMoreFiles = async (req, res) => {
  const { lessonId } = req.params;
  const pdfFiles = req.files;

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    console.log(pdfFiles, "pdfFiles");

    for (const file of pdfFiles) {
      const result = await uploadToCloudinary(file.buffer, "lesson_files", file.originalname);

      console.log(result, )
      lesson.pdfFiles.push({
        url: result.secure_url,
        filename: file.originalname,
        public_id: result.public_id,
      });
    }

    await lesson.save();

    res.status(200).json({ message: "Files added successfully" });
  } catch (error) {
    console.error("Error adding files:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteFile = async (req, res) => {
  const { lessonId, fileId } = req.params;

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const fileIndex = lesson.pdfFiles.findIndex(
      (file) => file._id.toString() === fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = lesson.pdfFiles[fileIndex];

    if (!file.public_id) {
      return res.status(400).json({ message: "Missing Cloudinary public_id for file" });
    }

    console.log("Deleting file from Cloudinary with public_id:", file.public_id);

    const result = await cloudinary.uploader.destroy(file.public_id, {
      resource_type: "raw",
    });

    console.log("Cloudinary deletion response:", result);

    if (result.result !== "ok" && result.result !== "not found") {
      return res.status(500).json({ message: "Failed to delete file from Cloudinary" });
    }

    lesson.pdfFiles.splice(fileIndex, 1);
    await lesson.save();

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
