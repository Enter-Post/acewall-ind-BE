import express from "express";
import { askAI, askAIupdated, getChatHistory } from "../Contollers/aiChat.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { upload } from "../lib/DSmulter.config.js";

const router = express.Router();

router.post("/ask", upload.single("file"), isUser, askAI);
router.get("/getChatHistory", isUser, getChatHistory)
router.post("/askupdated", upload.single("file"), isUser, askAIupdated);


export default router;