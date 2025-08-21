import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { getGPAScale, setGPAscale } from "../Contollers/GPA.controller.js";

const router = express.Router();

router.post("/setGPAscale/:courseId", isUser, setGPAscale);
router.get("/get/:courseId", isUser, getGPAScale);


export default router;