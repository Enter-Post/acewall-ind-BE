import express from 'express';
import { createReferral } from '../Contollers/referral.controller';

const router = express.Router();

router.post("/createReferral", createReferral)

export default router;