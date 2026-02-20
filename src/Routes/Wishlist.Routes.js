import express from "express";
import { wishlist, wishlistget } from "../Contollers/Wishlist.controller.js";
const router = express.Router();


router.post('/wishlistdone', wishlist);
router.get('/wishlist', wishlistget);



/**
 * @openapi
 * /api/wishlist/wishlistdone:
 *   post:
 *     tags:
 *       - Wishlist
 *     summary: Add or toggle wishlist item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Wishlist updated
 */
router.post('/wishlistdone', wishlist);

/**
 * @openapi
 * /api/wishlist/wishlist:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Get wishlist for current user
 *     responses:
 *       200:
 *         description: Wishlist items
 */
router.get('/wishlist', wishlistget);

export default router;
