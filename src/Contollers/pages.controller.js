import { uploadToCloudinary } from "../lib/cloudinary-course.config.js";
import Pages from "../Models/Pages.modal.js";
import CourseSch from "../Models/courses.model.sch.js";
import Enrollment from "../Models/Enrollement.model.js";
import { ValidationError, NotFoundError } from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";


// ✅ Create a new course post/page
// Create Page
export const createpage = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { courseId, type, typeId } = req.params;

    if (!courseId) {
        throw new ValidationError("Course ID is required.", "PAGE_001");
    }

    const image = req.files?.image?.[0];
    const files = req.files?.files || [];
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

    return res.status(201).json({
        message: "Page created successfully",
        page: newPage,
    });
});

export const getAllPages = asyncHandler(async (req, res) => {
    const { courseId, type, typeId } = req.params;

    let pages;

    if (type === "lesson") {
        pages = await Pages.find({ lesson: typeId });
    }
    if (type === "chapter") {
        pages = await Pages.find({ chapter: typeId });
    }
    if (!pages) {
        throw new NotFoundError("Pages not found", "PAGE_002");
    }

    return res.status(200).json({
        pages,
        message: "Pages found successfully"
    });
});


// DELETE a page by ID
export const deletePage = asyncHandler(async (req, res) => {
    const { pageId } = req.params;

    const deletedPage = await Pages.findByIdAndDelete(pageId);

    if (!deletedPage) {
        throw new NotFoundError("Page not found", "PAGE_003");
    }

    return res.status(200).json({ 
        page: deletedPage,
        message: "Page deleted successfully"
    });
});

export const ChapterPagesforStudent = asyncHandler(async (req, res) => {
    const { chapterId } = req.params;

    const pages = await Pages.find({ chapter: chapterId });

    if (!pages || pages.length === 0) {
        throw new NotFoundError("No pages found", "PAGE_004");
    }

    return res.status(200).json({
        pages,
        message: "Pages found successfully"
    });
});

export const lessonPagesforStudent = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;

    const pages = await Pages.find({ lesson: lessonId });

    if (!pages || pages.length === 0) {
        throw new NotFoundError("No pages found", "PAGE_005");
    }

    return res.status(200).json({
        pages,
        message: "Pages found successfully"
    });
});