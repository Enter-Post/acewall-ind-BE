import express from 'express';
import { getStandardGradingScale, SetStandardGradingScale } from '../Contollers/StandardGrading.controller.js';
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.get("/get/:courseId", isUser, getStandardGradingScale);
router.post("/set/:courseId", isUser, SetStandardGradingScale);

export default router;