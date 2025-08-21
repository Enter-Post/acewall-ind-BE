import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import Pages from "../Models/Pages.modal.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";


// ✅ Create a new course post/page
// Create Page
export const createpage = async (req, res) => {
    const { title, description } = req.body;
    const { courseId, type, typeId } = req.params;

    if (!courseId) {
        return res.status(400).json({ message: "Course ID is required." });
    }

    const image = req.files?.image?.[0];
    const files = req.files?.files || [];

    try {
        const uploadedFiles = await Promise.all(
            files.map(async (file) => {
                const result = await uploadToCloudinary(file.buffer, "discussion_files");
                return {
                    url: result.secure_url,
                    publicId: result.public_id,
                    type: file.mimetype,
                    filename: file.originalname,
                };
            })
        );

        let imageData = null;
        if (image) {
            const result = await uploadToCloudinary(image.buffer, "page_images");
            imageData = {
                url: result.secure_url,
                publicId: result.public_id,
                filename: image.originalname,
            };
        }

        let newPage;

        if (type === "lesson") {
            newPage = new Pages({
                title,
                description,
                course: courseId,
                type,
                lesson: typeId,
                image: imageData,
                files: uploadedFiles,
            });

        } else if (type === "chapter") {
            newPage = new Pages({
                title,
                description,
                course: courseId,
                type,
                chapter: typeId,
                image: imageData,
                files: uploadedFiles,
            });

        }
        await newPage.save();

        res.status(201).json({
            message: "Page created successfully",
            page: newPage,
        });
    } catch (error) {
        console.error("Error creating page:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getAllPages = async (req, res) => {
    const { courseId, type, typeId } = req.params
    try {
        let pages;

        if (type === "lesson") {
            pages = await Pages.find({ lesson: typeId })
        }
        if (type === "chapter") {
            pages = await Pages.find({ chapter: typeId })
        }
        if (!pages) {
            return res.status(404).json({
                message: "Pages not found"
            })
        }

        res.status(201).json({
            pages,
            message: "pages found successfully."
        })

    } catch (error) {
        console.error("Error fetching pages:", error);
        res.status(500).json({ message: "Failed to fetch pages" });
    }
};


// DELETE a page by ID
export const deletePage = async (req, res) => {
    const { pageId } = req.params;

    try {
        const deletedPage = await Pages.findByIdAndDelete(pageId);

        if (!deletedPage) {
            return res.status(404).json({ message: "Page not found" });
        }

        res.status(200).json({ message: "Page deleted successfully", page: deletedPage });
    } catch (error) {
        console.error("Error deleting page:", error);
        res.status(500).json({ message: "Failed to delete page", error: error.message });
    }
};

export const ChapterPagesforStudent = async (req, res) => {
    const { chapterId } = req.params
    try {
        const pages = await Pages.find({ chapter: chapterId })

        if (!pages) {
            res.status(404).json({
                message: "no pages found"
            })
        }

        res.status(201).json({
            pages,
            message: "Pages found successfully"
        })
    } catch (error) {
        console.log("error in getting chapter for student", error)
        res.status(500).json({
            message: "Internal server Error"
        })
    }
}

export const lessonPagesforStudent = async (req, res) => {
    const { lessonId } = req.params
    try {
        const pages = await Pages.find({ lesson: lessonId })

        if (!pages) {
            res.status(404).json({
                message: "no pages found"
            })
        }

        res.status(201).json({
            pages,
            message: "Pages found successfully"
        })
    } catch (error) {
        console.log("error in getting chapter for student", error)
        res.status(500).json({
            message: "Internal server Error"
        })
    }
}