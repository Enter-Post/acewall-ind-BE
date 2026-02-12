import mongoose from "mongoose";
import { Notification } from "../Models/Notification.model.js";

export const createNotification = async ({
  recipient,
  sender = null,
  message,
  type = "general",
  link = null,
}) => {
  try {
    if (!recipient || !message) {
      throw new Error("recipient and message are required");
    }

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: sender ? new mongoose.Types.ObjectId(sender) : null,
      message,
      type,
      link,
    });

    return notification;
  } catch (error) {
    console.error("❌ Notification creation failed:", error.message);
    return null;
  }
};
