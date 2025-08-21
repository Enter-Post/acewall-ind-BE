import express from "express";
import {
  createCategory,
  deleteCategory,
  editCategory,
  getAllCategories,
  getSubcategoriesByCategoryId,
} from "../Contollers/category.controller.js";

const router = express.Router();

router.get("/get", getAllCategories);
router.post("/create", createCategory);
router.delete("/delete/:categoryId", deleteCategory);
router.get("/subcategories/:categoryId", getSubcategoriesByCategoryId);
router.put("/edit/:categoryId", editCategory);

export default router;
