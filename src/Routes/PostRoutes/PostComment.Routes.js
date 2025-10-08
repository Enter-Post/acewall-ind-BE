//PostComment.Routes.js

import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { getPostComment, sendPostComment } from "../../Contollers/PostControllers/postComment.controller.js";

const router = express.Router();

router.post("/sendComment/:id", isUser, sendPostComment);
router.get("/getPostComment/:id", isUser, getPostComment)

export default router;