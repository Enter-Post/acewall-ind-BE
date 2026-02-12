import Referral from "../models/referral.model.js";
import { generateReferralCode } from "../Utiles/referalcodegenerator.js";

export const createReferral = async (req, res) => {
  try {
    const userId = req.user._id; // from auth middleware
    const userName = req.user.name || "USER";

    // Check if referral already exists
    const existingReferral = await Referral.findOne({ referralUser: userId });
    if (existingReferral) {
      return res.status(200).json({
        success: true,
        referral: existingReferral,
        message: "Referral already exists"
      });
    }

    const referralCode = generateReferralCode(userName);

    const referralLink = `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`;

    const referral = await Referral.create({
      referralCode,
      referralLink,
      referralUser: userId
    });

    res.status(201).json({
      success: true,
      referral
    });

  } catch (error) {
    console.error("Create referral error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create referral"
    });
  }
};