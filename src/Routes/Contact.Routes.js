import express from "express";
import { sendSchoolcontactmail } from "../Contollers/contact.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/contact/sendSchoolcontactmail:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Send a contact email to school/support
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post("/sendSchoolcontactmail", sendSchoolcontactmail)

export default router;

