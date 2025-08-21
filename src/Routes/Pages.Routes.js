import express from "express";
import { ChapterPagesforStudent, createpage, deletePage, getAllPages, lessonPagesforStudent } from "../Contollers/pages.controller.js";
import { upload } from "../lib/multer.config.js";



const router = express.Router();

router.post(
    "/createpage/:courseId/:type/:typeId",
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "files", maxCount: 10 },
    ]),
    createpage
);
router.get("/:courseId/:type/:typeId", getAllPages);
router.delete("/deletepage/:pageId", deletePage);
router.get("/getChapterPages/:chapterId", ChapterPagesforStudent)
router.get("/getLessonPages/:lessonId", lessonPagesforStudent)


export default router;