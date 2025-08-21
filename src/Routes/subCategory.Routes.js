import express from "express";
import {
  createSubCategory,
  getSubcategory,
  deleteSubcategory,
  updateSubCategory,
} from "../Contollers/CourseControllers/subCategory.controller.js";

const router = express.Router();

router.post("/create", createSubCategory);
router.get("/get", getSubcategory);
router.delete("/delete/:id", deleteSubcategory);
router.put("/:id", updateSubCategory);

export default router;
