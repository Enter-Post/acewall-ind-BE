import express from "express";
import { getPurchasedCourses, purchaseCourse } from "../Contollers/purchase.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

router.post("/courses/:id", isUser, purchaseCourse);
router.get("/courses", isUser, getPurchasedCourses);

export default router;