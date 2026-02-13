import { getRecieverSocketId, io } from "../lib/socket.io.js";
import Conversation from "../Models/conversation.model.js";
import Message from "../Models/messages.model.js";
import User from "../Models/user.model.js";
import {
  NotFoundError,
} from "../Utiles/errors.js";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import { notifyMessageReceived } from "../Utiles/notificationService.js";

export const createMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const myId = req.user._id;
  const { text } = req.body;

  // 1. Save the message
  const newMessage = new Message({
    conversationId,
    text,
    sender: myId,
    readBy: [myId],
  });
  await newMessage.save();

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text || "[Media]",
    lastMessageAt: new Date(),
  });

  // 2. Fetch the conversation to find the receiver
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError("Conversation not found", "MSG_001");
  }

    // Assuming 1-to-1 conversation with two users
    const receiverId = conversation.members.find(
      (id) => id.toString() !== myId.toString()
    );

    const receiverSocketId = getRecieverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

  // Send notification to receiver
  try {
    const receiver = await User.findById(receiverId).select('role');
    if (receiver) {
      const senderName = `${req.user.firstName} ${req.user.lastName}`;
      await notifyMessageReceived(
        receiverId,
        senderName,
        myId,
        receiver.role,
        conversationId
      );
    }
  } catch (error) {
    console.error("Message notification error:", error.message);
  }

  // 3. Populate sender data
  const populatedMessage = await newMessage.populate(
    "sender",
    "firstName lastName profileImg"
  );

  // 4. Respond
  return res.status(200).json({
    newMessage: populatedMessage,
    message: "Message created successfully"
  });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversation not found", "MSG_002");
  }

    const totalmessages = await Message.find({ conversationId })
      .populate("sender", "firstName lastName profileImg")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

  const enhancedMessages = totalmessages.map((msg) => ({
    ...msg,
    isUnread: !msg.readBy?.some(
      (id) => id.toString() === req.user._id.toString()
    ),
  }));

  return res.status(200).json({
    messages: enhancedMessages,
    message: "Messages fetched successfully"
  });
});

export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  await Message.updateMany(
    {
      conversationId,
      readBy: { $ne: userId },
      sender: { $ne: userId }, // only mark others' messages
    },
    {
      $addToSet: { readBy: userId }, // avoid duplicates
    }
  );

  return res.status(200).json({ 
    message: "Messages marked as read" 
  });
});

// GET /conversations/unread
export const getAllUnreadCounts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({ members: userId }).lean();

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        readBy: { $ne: userId },
        sender: { $ne: userId },
      });

      return {
        ...conv,
        unreadCount,
      };
    })
  );

  res.status(200).json(results);
});
