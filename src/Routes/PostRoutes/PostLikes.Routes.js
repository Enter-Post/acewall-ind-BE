

import express from "express";
import { isUser } from "../../middlewares/Auth.Middleware.js";
import { isPostLiked, likePost } from "../../Contollers/PostControllers/postLikes.controller.js";

const router = express.Router();

router.post("/like/:id", isUser, likePost);
router.get("/isPostLiked/:id", isUser, isPostLiked);

export default router;