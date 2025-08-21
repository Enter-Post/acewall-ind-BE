import { getRecieverSocketId, io } from "../lib/socket.io.js";
import Conversation from "../Models/conversation.model.js";
import Message from "../Models/messages.model.js";

export const createMessage = async (req, res) => {
  const { conversationId } = req.params;
  const myId = req.user._id;
  const { text } = req.body;

  try {
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
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Assuming 1-to-1 conversation with two users
    const receiverId = conversation.members.find(
      (id) => id.toString() !== myId.toString()
    );

    const receiverSocketId = getRecieverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // 3. Populate sender data
    const populatedMessage = await newMessage.populate(
      "sender",
      "firstName lastName profileImg"
    );

    // 4. Respond
    res.status(200).json({
      message: "Message created successfully",
      newMessage: populatedMessage,
    });
  } catch (err) {
    console.error("Error in createMessage:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversationMessages = async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
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

    res.status(200).json({
      message: "messages fetched successfully",
      messages: enhancedMessages,
    });
  } catch (err) {
    console.log("error in getConversationMessages", err);
    res.status(500).json(err);
  }
};

export const markMessagesAsRead = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  try {
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

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Error in markMessagesAsRead:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /conversations/unread
export const getAllUnreadCounts = async (req, res) => {
  const userId = req.user._id;

  try {
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
  } catch (err) {
    console.error("Error in getUnreadCounts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
