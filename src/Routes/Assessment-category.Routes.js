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

/**
 * @openapi
 * /api/assessment-category/{courseId}:
 *   post:
 *     tags:
 *       - Assessment Category
 *     summary: Create an assessment category for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               weight:
 *                 type: number
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post(
  "/:courseId",
  isUser,
  validateCategoryWeight,
  createAssessmentCategory
);

/**
 * @openapi
 * /api/assessment-category/{courseId}:
 *   get:
 *     tags:
 *       - Assessment Category
 *     summary: Get all assessment categories for a course
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/:courseId", isUser, getAssessmentCategories);

/**
 * @openapi
 * /api/assessment-category/{courseId}/{categoryId}:
 *   put:
 *     tags:
 *       - Assessment Category
 *     summary: Edit category weight
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *     responses:
 *       200:
 *         description: Category weight updated
 */
router.put(
  "/:courseId/:categoryId",
  isUser,
  validateCategoryWeight,
  editWeight
);

/**
 * @openapi
 * /api/assessment-category/{categoryId}:
 *   delete:
 *     tags:
 *       - Assessment Category
 *     summary: Delete an assessment category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete("/:categoryId", isUser, deleteAssessmentCategory);

export default router;
