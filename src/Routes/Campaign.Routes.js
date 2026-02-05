import express from "express";
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getActiveCampaign,
  getAllCampaigns,
} from "../Contollers/Campaign.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";
import { checkRole } from "../middlewares/admins.middleware.js";

const router = express.Router();

// Public endpoint
router.get("/active", getActiveCampaign);

// Admin only endpoints
router.use(isUser, checkRole);

router.get("/", getAllCampaigns);
router.post("/", createCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;
