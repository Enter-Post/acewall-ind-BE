import express from "express";
import { getAllSubscribers, subscribeToNewsletter } from "../Contollers/newsletter.controller.js";
const router = express.Router();


router.post('/subscribe', subscribeToNewsletter);
router.get('/subscribers', getAllSubscribers);




export default router;
