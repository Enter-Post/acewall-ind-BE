import express from "express";
import {
  createReferral,
  updateReferral,
  deleteReferral,
  getActiveReferral,
  getAllReferrals,
} from "../Contollers/Referral.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { checkRole } from "../middlewares/admins.middleware.js";

const router = express.Router();

// Public endpoint
router.get("/active", getActiveReferral);

// Admin only endpoints
router.use(isUser, checkRole);

router.get("/", getAllReferrals);
// router.post("/", createReferral);
router.put("/:id", updateReferral);
router.delete("/:id", deleteReferral);
router.post("/createReferral", createReferral)
export default router;
