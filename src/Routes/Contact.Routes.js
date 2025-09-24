import express from "express";
import { sendSchoolcontactmail } from "../Contollers/contact.controller.js";

const router = express.Router();

router.post("/sendSchoolcontactmail", sendSchoolcontactmail)

export default router;

