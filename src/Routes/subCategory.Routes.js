import express from "express";
import {
  createSubCategory,
  getSubcategory,
  deleteSubcategory,
  updateSubCategory,
} from "../Contollers/CourseControllers/subCategory.controller.js";
import { upload } from "../lib/multer.config.js";

const router = express.Router();

// Example Route
router.post("/create", upload.fields([{ name: 'image', maxCount: 1 }]), createSubCategory);
router.get("/get", getSubcategory);
router.delete("/delete/:id", deleteSubcategory);
router.put("/update/:id", upload.fields([{ name: 'image', maxCount: 1 }]), updateSubCategory);
export default router;
