import express from "express";
import { createPost, getPosts, specificUserPosts } from "../../Contollers/PostControllers/post.controller.js";
import { upload } from "../../lib/DSmulter.config.js";
import { isUser } from "../../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/", upload.array("assets"), isUser, createPost);
router.get("/getPosts", isUser, getPosts);
router.get("/specificUserPosts/:id", isUser, specificUserPosts);

export default router;