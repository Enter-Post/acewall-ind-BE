import express from "express";
import { wishlist, wishlistget } from "../Contollers/Wishlist.controller.js";
const router = express.Router();


router.post('/wishlistdone', wishlist);
router.get('/wishlist', wishlistget);






export default router;
