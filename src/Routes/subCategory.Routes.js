import express from "express";
import {
  createSubCategory,
  getSubcategory,
  deleteSubcategory,
  updateSubCategory,
} from "../Contollers/CourseControllers/subCategory.controller.js";
import { upload } from "../lib/multer.config.js";

const router = express.Router();

/**
 * @openapi
 * /api/subcategory/create:
 *   post:
 *     tags:
 *       - SubCategory
 *     summary: Create a subcategory (with image)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Subcategory created
 */
router.post("/create", upload.fields([{ name: 'image', maxCount: 1 }]), createSubCategory);

/**
 * @openapi
 * /api/subcategory/get:
 *   get:
 *     tags:
 *       - SubCategory
 *     summary: Get subcategories
 *     responses:
 *       200:
 *         description: Subcategories list
 */
router.get("/get", getSubcategory);

/**
 * @openapi
 * /api/subcategory/delete/{id}:
 *   delete:
 *     tags:
 *       - SubCategory
 *     summary: Delete a subcategory
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Subcategory deleted
 */
router.delete("/delete/:id", deleteSubcategory);

/**
 * @openapi
 * /api/subcategory/update/{id}:
 *   put:
 *     tags:
 *       - SubCategory
 *     summary: Update a subcategory (with image)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Subcategory updated
 */
router.put("/update/:id", upload.fields([{ name: 'image', maxCount: 1 }]), updateSubCategory);
export default router;
