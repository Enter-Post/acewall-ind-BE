import express from "express";
import { sendSupportMail } from "../Contollers/Support.controller.js";
// import { sendSupportMail } from "../contollers/Support.Controller.js";

const router = express.Router();

router.post("/send", sendSupportMail);

export default router;
