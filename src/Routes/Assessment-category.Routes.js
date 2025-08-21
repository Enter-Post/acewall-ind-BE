import express from "express";
import {
  createAssessmentCategory,
  deleteAssessmentCategory,
  editWeight,
  getAssessmentCategories,
} from "../Contollers/assessment-category.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { validateCategoryWeight } from "../middlewares/validCategoryWeight.middleware.js";

const router = express.Router();

router.post(
  "/:courseId",
  isUser,
  validateCategoryWeight,
  createAssessmentCategory
);
router.get("/:courseId", isUser, getAssessmentCategories);
router.put(
  "/:courseId/:categoryId",
  isUser,
  validateCategoryWeight,
  editWeight
);
router.delete("/:categoryId", isUser, deleteAssessmentCategory);

export default router;
