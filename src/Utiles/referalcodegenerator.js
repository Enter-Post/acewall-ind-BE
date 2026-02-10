import crypto from "crypto";

export const generateReferralCode = (userName = "") => {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  const prefix = userName.substring(0, 4).toUpperCase();
  return `${prefix}${random}`;
};