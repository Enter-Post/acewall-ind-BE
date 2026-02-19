import express from "express";
import {
  createCategory,
  deleteCategory,
  editCategory,
  getAllCategories,
  getSubcategoriesByCategoryId,
} from "../Contollers/category.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/category/get:
 *   get:
 *     tags:
 *       - Category
 *     summary: Get all categories
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/get", getAllCategories);

/**
 * @openapi
 * /api/category/create:
 *   post:
 *     tags:
 *       - Category
 *     summary: Create a category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */
router.post("/create", createCategory);

/**
 * @openapi
 * /api/category/delete/{categoryId}:
 *   delete:
 *     tags:
 *       - Category
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete("/delete/:categoryId", deleteCategory);

/**
 * @openapi
 * /api/category/subcategories/{categoryId}:
 *   get:
 *     tags:
 *       - Category
 *     summary: Get subcategories by category id
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Subcategories list
 */
router.get("/subcategories/:categoryId", getSubcategoriesByCategoryId);

/**
 * @openapi
 * /api/category/edit/{categoryId}:
 *   put:
 *     tags:
 *       - Category
 *     summary: Edit a category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put("/edit/:categoryId", editCategory);

export default router;
