import express from "express";
import { isUser } from "../middlewares/Auth.Middleware.js";
import {
  createRating,
  getSingleCourseRating,
  isRatedbyUser,
} from "../Contollers/rating.controller.js";

const router = express.Router();

router.post("/create/:id", isUser, createRating);
router.get("/course/:id", isUser, getSingleCourseRating);
router.get("/isRated/:id", isUser, isRatedbyUser);

export default router;
